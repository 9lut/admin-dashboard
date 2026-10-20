import { z } from 'zod';
import { Forbidden, handle, ok } from '@/lib/http/response';
import { requireAuth } from '@/lib/auth/guard';
import { col } from '@/lib/firebase/firestore';
import { accountRepo } from '@/lib/repositories/accountRepo';
import { permissionRepo } from '@/lib/repositories/permissionRepo';
import { allowedMenus } from '@/lib/access/menus';
import { CONTENT, CONTENT_TYPES } from '@/lib/content/types';
import { publishState } from '@/lib/content/publish';
import { dayRange, readDailyViews } from '@/lib/content/views';
import { aggregate, type ItemMeta } from '@/lib/content/stats';
import { withCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const query = z.object({ days: z.coerce.number().int().refine((d) => [7, 30, 90, 365].includes(d)).default(30) });

/** ข้อมูลประกอบของเนื้อหาทุกชิ้น (ชื่อ ยอดรวม สถานะ) — แคช 5 นาที */
const itemMeta = () =>
    withCache('stats:items', 300_000, async () => {
        const now = Date.now();
        const lists = await Promise.all(
            CONTENT_TYPES.map(async (t) => {
                const snap = await col(CONTENT[t].collection).get();
                return snap.docs.map((d): ItemMeta => {
                    const data = d.data();
                    return {
                        type: t,
                        id: d.id,
                        title: CONTENT[t].title(data),
                        totalViews: Number(data.views ?? 0),
                        createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
                        href: CONTENT[t].editHref(d.id, data),
                        state: t === 'blog' ? (data.status === 'draft' ? 'draft' : 'published') : publishState(data, now),
                    };
                });
            }),
        );
        return lists.flat();
    });

/** สถิติการเข้าชมรายเนื้อหา + กราฟรายวัน (เปิดให้ผู้มีสิทธิ์แดชบอร์ดหรือหน้าสถิติ) */
export const GET = handle(async (req) => {
    const me = await requireAuth();
    if (me.role !== 'superadmin') {
        const [account, settings] = await Promise.all([accountRepo.findOne(me.uid), permissionRepo.getSettings()]);
        const menus = allowedMenus(me.role, account.departments as string[] | undefined, settings.departments);
        if (!menus.has('/admin/stats') && !menus.has('/admin')) throw Forbidden('Insufficient menu permissions');
    }
    const { days } = query.parse(Object.fromEntries(new URL(req.url).searchParams));
    // อ่านย้อนหลัง 2 เท่าเพื่อเทียบกับช่วงก่อนหน้า
    const range = dayRange(days * 2);
    const [daily, items] = await Promise.all(
        [withCache(`stats:daily:${days}`, 60_000, () => readDailyViews(days * 2)), itemMeta()] as const,
    );
    return ok(aggregate(range, daily, items, true));
});
