import { z } from 'zod';
import { handle, ok } from '@/lib/http/response';
import { requireRole, Role } from '@/lib/auth/guard';
import { systemLogRepo } from '@/lib/repositories/systemLogRepo';
import { accountRepo } from '@/lib/repositories/accountRepo';
import { withCache } from '@/lib/cache';

const query = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().max(200).optional(),
    action: z.string().max(30).optional(),
    userId: z.string().max(200).optional(),
    resource: z.string().max(60).optional(),
    q: z.string().trim().max(100).optional(),
    since: z.coerce.date().optional(),
    until: z.coerce.date().optional(),
    order: z.enum(['asc', 'desc']).default('desc'),
});

type UserInfo = { email: string; firstName: string; lastName: string };

/** แผนที่ uid → ข้อมูลผู้ใช้ (แคช 60 วิ — ใช้ทั้งเติมชื่อและค้นหาตามชื่อ) */
const userMap = () =>
    withCache('logs:users', 60_000, async () => {
        const map: Record<string, UserInfo> = {};
        for (const a of await accountRepo.findAll()) {
            map[a._id] = { email: String(a.email ?? ''), firstName: String(a.firstName ?? ''), lastName: String(a.lastName ?? '') };
        }
        return map;
    });

/**
 * ค้นหาบันทึกระบบฝั่ง server — ส่ง cursor กลับไปเพื่อโหลดหน้าถัดไป
 * ?limit=50&action=DELETE&resource=news&userId=…&q=…&since=ISO&until=ISO&order=desc&cursor=…
 */
export const GET = handle(async (req) => {
    await requireRole(Role.SUPERADMIN);
    const p = query.parse(Object.fromEntries(new URL(req.url).searchParams));
    const empty = (v?: string) => (v ? v : undefined);

    const users = await userMap();
    const q = p.q?.toLowerCase();
    const userIdsMatchingQ = q
        ? new Set(Object.entries(users).filter(([, u]) => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q)).map(([id]) => id))
        : undefined;

    const res = await systemLogRepo.search({
        ...p,
        action: empty(p.action),
        userId: empty(p.userId),
        resource: empty(p.resource),
        q: empty(p.q),
        userIdsMatchingQ,
    });

    const rows = res.rows.map((log) => {
        const uid = log.userId as string | undefined;
        return { ...log, _user: uid && users[uid] ? users[uid] : null };
    });
    return ok({ ...res, rows }, 'Fetched system logs');
});
