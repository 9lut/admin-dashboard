import { handle, ok } from '@/lib/http/response';
import { requireMenuPermission } from '@/lib/auth/guard';
import { accountRepo } from '@/lib/repositories/accountRepo';
import { activityRepo } from '@/lib/repositories/activityRepo';
import { blogRepo } from '@/lib/repositories/blogRepo';
import { newsRepo } from '@/lib/repositories/newsRepo';
import { prayerRoomRepo } from '@/lib/repositories/prayerRoomRepo';
import { withCache } from '@/lib/cache';
import { parseOptionalDate } from '@/lib/http/query';

const STATS_TTL = 5 * 60 * 1000; // 5 minutes

export const GET = handle(async (req) => {
    await requireMenuPermission('/admin');
    
    const url = new URL(req.url);
    const startDate = parseOptionalDate(url.searchParams, 'startDate');
    const endDate = parseOptionalDate(url.searchParams, 'endDate');

    const cacheKey = `dashboard:stats:${startDate ?? 'all'}:${endDate ?? 'all'}`;

    const data = await withCache(cacheKey, STATS_TTL, async () => {
        const [users, activities, blogs, news, prayerRooms] = await Promise.all([
            accountRepo.countAll(startDate, endDate),
            activityRepo.countAll(startDate, endDate),
            blogRepo.countAll(startDate, endDate),
            newsRepo.countAll(startDate, endDate),
            prayerRoomRepo.countAll(startDate, endDate),
        ]);
        return { users, activities, blogs, news, prayerRooms };
    });

    return ok(data, 'Fetched dashboard stats');
});
