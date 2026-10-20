import { z } from 'zod';
import { handle, ok } from '@/lib/http/response';
import { requireAuth } from '@/lib/auth/guard';
import { accountRepo } from '@/lib/repositories/accountRepo';
import { permissionRepo } from '@/lib/repositories/permissionRepo';
import { allowedMenus } from '@/lib/access/menus';
import { listTrash, purgeExpired, purgeTrash, restoreFromTrash } from '@/lib/content/lifecycle';
import { CONTENT, type ContentType } from '@/lib/content/types';
import { withCache } from '@/lib/cache';

/** ประเภทเนื้อหาที่ผู้ใช้คนนี้จัดการได้ (ถังขยะเห็นเฉพาะประเภทของตัวเอง) */
async function allowedTypes() {
    const me = await requireAuth();
    const isSuper = me.role === 'superadmin';
    const [account, settings] = await Promise.all([
        isSuper ? Promise.resolve(null) : accountRepo.findOne(me.uid),
        isSuper ? Promise.resolve({ departments: {} }) : permissionRepo.getSettings(),
    ]);
    const menus = allowedMenus(me.role, account?.departments as string[] | undefined, settings.departments);
    return { me, can: (t: ContentType) => !!CONTENT[t] && menus.has(CONTENT[t].menu) };
}

const names = () =>
    withCache('content:user-names', 60_000, async () => {
        const map: Record<string, string> = {};
        for (const a of await accountRepo.findAll()) map[a._id] = `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim() || String(a.email ?? '');
        return map;
    });

export const GET = handle(async () => {
    const { can } = await allowedTypes();
    // ลบรายการที่หมดอายุทิ้งก่อนแสดง (สำรองไว้เผื่อ cron ไม่ได้รัน)
    await purgeExpired().catch((e) => console.error('[trash] purge expired failed', e));
    const [rows, map] = await Promise.all([listTrash(), names()]);
    return ok(rows.filter((r) => can(r.type)).map((r) => ({ ...r, byName: map[r.by] ?? 'ไม่ทราบชื่อ' })));
});

const body = z.object({ action: z.enum(['restore', 'purge']), ids: z.array(z.string().min(1).max(300)).min(1).max(200) });

export const POST = handle(async (req) => {
    const { can } = await allowedTypes();
    const { action, ids } = body.parse(await req.json());
    const result = action === 'restore' ? await restoreFromTrash(ids, can) : await purgeTrash(ids, can);
    return ok(result, action === 'restore' ? 'Restored' : 'Purged');
});
