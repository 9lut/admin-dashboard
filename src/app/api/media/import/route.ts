import { z } from 'zod';
import { Forbidden, handle, ok } from '@/lib/http/response';
import { requireAuth, Role } from '@/lib/auth/guard';
import { accountRepo } from '@/lib/repositories/accountRepo';
import { permissionRepo } from '@/lib/repositories/permissionRepo';
import { allowedMenus } from '@/lib/access/menus';
import { CONTENT, CONTENT_TYPES } from '@/lib/content/types';
import { fetchRemoteImage } from '@/lib/storage/remote';
import { uploadImage } from '@/lib/storage/r2';
import { clearCache } from '@/lib/cache';
import { enforceRateLimit, rateLimitKey } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const body = z.object({ url: z.string().trim().min(8).max(2000) });

/**
 * ดึงรูปจากลิงก์ (เช่นรูปจากโพสต์ Facebook) แล้วเก็บเข้าคลังรูปบน R2
 * ต้องเก็บสำเนาเอง เพราะลิงก์รูปของ Facebook หมดอายุภายในไม่กี่วัน
 */
export const POST = handle(async (req) => {
    const me = await requireAuth();
    if (me.role !== Role.SUPERADMIN) {
        const [account, settings] = await Promise.all([accountRepo.findOne(me.uid), permissionRepo.getSettings()]);
        const menus = allowedMenus(me.role, account.departments as string[] | undefined, settings.departments);
        if (!CONTENT_TYPES.some((t) => menus.has(CONTENT[t].menu))) throw Forbidden('Insufficient menu permissions');
    }
    enforceRateLimit(rateLimitKey(req, `media-import:${me.uid}`), 30, 10 * 60 * 1000);
    const { url } = body.parse(await req.json());
    const buffer = await fetchRemoteImage(url);
    const stored = await uploadImage(buffer);
    clearCache('media:');
    return ok({ url: stored, source: url }, 'Imported', 201);
});
