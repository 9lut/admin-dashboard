import { z } from 'zod';
import { BadRequest, Forbidden, handle, ok } from '@/lib/http/response';
import { requireAuth, requireRole, Role } from '@/lib/auth/guard';
import { accountRepo } from '@/lib/repositories/accountRepo';
import { permissionRepo } from '@/lib/repositories/permissionRepo';
import { allowedMenus } from '@/lib/access/menus';
import { CONTENT, CONTENT_TYPES } from '@/lib/content/types';
import { collectUsage, listOwnObjects, OWN_KEY } from '@/lib/content/media';
import { deleteFiles, uploadFile } from '@/lib/storage/r2';
import { clearCache, withCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** คลังรูปเปิดให้คนที่แก้เนื้อหาได้อย่างน้อย 1 ประเภท (ใช้เลือกรูปซ้ำ) */
async function requireContentEditor() {
    const me = await requireAuth();
    if (me.role === Role.SUPERADMIN) return me;
    const [account, settings] = await Promise.all([accountRepo.findOne(me.uid), permissionRepo.getSettings()]);
    const menus = allowedMenus(me.role, account.departments as string[] | undefined, settings.departments);
    if (!CONTENT_TYPES.some((t) => menus.has(CONTENT[t].menu))) throw Forbidden('Insufficient menu permissions');
    return me;
}

/** รายการรูปทั้งหมดของระบบบน R2 พร้อมบอกว่าใช้อยู่ที่ไหน (แคช 60 วิ — สแกนทั้งระบบ) */
export const GET = handle(async (req) => {
    await requireContentEditor();
    if (new URL(req.url).searchParams.get('refresh') === '1') clearCache('media:');
    const data = await withCache('media:index', 60_000, async () => {
        const [objects, usage] = await Promise.all([listOwnObjects(), collectUsage()]);
        return objects
            .map((o) => {
                const used = usage.get(o.key) ?? [];
                const status = used.some((u) => u.kind === 'content' || u.kind === 'settings') ? 'used' : used.length ? 'history' : 'unused';
                return { ...o, status, usage: used };
            })
            .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    });
    return ok(data);
});

/** อัปโหลดรูปเข้าคลัง (เลือกไปใช้ในเนื้อหาภายหลังได้) */
export const POST = handle(async (req) => {
    await requireContentEditor();
    const form = await req.formData();
    const files = form.getAll('files').filter((f): f is File => f instanceof File).slice(0, 20);
    if (!files.length) throw BadRequest('ไม่พบไฟล์');
    const urls: string[] = [];
    for (const f of files) urls.push(await uploadFile(f));
    clearCache('media:');
    return ok({ urls }, 'Uploaded', 201);
});

const del = z.object({ keys: z.array(z.string().regex(OWN_KEY)).min(1).max(500) });

/** ลบรูปถาวร — เฉพาะผู้ดูแลสูงสุด และลบได้เฉพาะรูปที่ "ไม่มีที่ใช้" (ตรวจซ้ำฝั่ง server ทุกครั้ง) */
export const DELETE = handle(async (req) => {
    await requireRole(Role.SUPERADMIN);
    const { keys } = del.parse(await req.json());
    const usage = await collectUsage();
    const blocked = keys.filter((k) => (usage.get(k) ?? []).length > 0);
    const deletable = keys.filter((k) => !blocked.includes(k));
    const domain = (process.env.R2_PUBLIC_DOMAIN ?? '').replace(/\/$/, '');
    const failed = deletable.length ? await deleteFiles(deletable.map((k) => `${domain}/${k}`)) : 0;
    clearCache('media:');
    return ok({ deleted: deletable.length - failed, blocked, failed }, 'Deleted');
});
