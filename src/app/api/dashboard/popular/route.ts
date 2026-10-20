import { handle, ok } from '@/lib/http/response';
import { requireMenuPermission } from '@/lib/auth/guard';
import { activityRepo } from '@/lib/repositories/activityRepo';
import { blogRepo } from '@/lib/repositories/blogRepo';
import { newsRepo } from '@/lib/repositories/newsRepo';
import { withCache } from '@/lib/cache';

const POPULAR_TTL = 10 * 60 * 1000; // 10 minutes

export const GET = handle(async () => {
    await requireMenuPermission('/admin');

    const data = await withCache('dashboard:popular', POPULAR_TTL, async () => {
        const [activities, blogs, news] = await Promise.all([
            activityRepo.getMostViewed(5),
            blogRepo.getMostViewed(5),
            newsRepo.getMostViewed(5),
        ]);
        return { activities, blogs, news };
    });

    return ok(data, 'Fetched popular content');
});
