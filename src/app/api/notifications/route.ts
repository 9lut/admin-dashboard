import { z } from 'zod';
import { handle, ok } from '@/lib/http/response';
import { requireAuth, requireMenuPermission, Role } from '@/lib/auth/guard';
import { accountRepo } from '@/lib/repositories/accountRepo';
import { activityRepo } from '@/lib/repositories/activityRepo';
import { newsRepo } from '@/lib/repositories/newsRepo';
import { permissionRepo } from '@/lib/repositories/permissionRepo';
import { allowedMenus } from '@/lib/access/menus';
import { withCache } from '@/lib/cache';
import { activityNotifications, newsReviewNotifications, userNotifications, type NotificationItem } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

/** การแจ้งเตือนของผู้ใช้ปัจจุบัน — เห็นเฉพาะเรื่องในเมนูที่ตนมีสิทธิ์ */
export const GET = handle(async () => {
    const me = await requireAuth();
    const isSuper = me.role === Role.SUPERADMIN;
    const [account, settings] = await Promise.all([
        isSuper ? Promise.resolve(null) : accountRepo.findOne(me.uid),
        isSuper ? Promise.resolve({ departments: {} }) : permissionRepo.getSettings(),
    ]);
    const can = allowedMenus(me.role, account?.departments as string[] | undefined, settings.departments);

    const now = Date.now();
    const tasks: Promise<NotificationItem[]>[] = [];
    if (can.has('/admin/activity') || can.has('/admin/activity/calendar')) {
        tasks.push(withCache('api_activities_all', 120000, () => activityRepo.findAll()).then((list) => activityNotifications(list as never, now)));
    }
    if (can.has('/admin/news')) {
        tasks.push(newsRepo.pendingReview().then((list) => newsReviewNotifications(list)));
    }
    if (isSuper) {
        tasks.push(accountRepo.findAll().then((list) => userNotifications(list as never, now)));
    }

    const settled = await Promise.allSettled(tasks);
    const items = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
    return ok({ items, generatedAt: new Date(now).toISOString() });
});

const action = z.object({ action: z.literal('review-news'), id: z.string().min(1).max(200) });

/** ทำเครื่องหมายว่าตรวจข่าวที่ดึงอัตโนมัติแล้ว */
export const POST = handle(async (req) => {
    const { id } = action.parse(await req.json());
    await requireMenuPermission('/admin/news');
    await newsRepo.markReviewed(id);
    return ok(null, 'Marked as reviewed');
});
