import { handle, ok } from '@/lib/http/response';
import { requireMenuPermission } from '@/lib/auth/guard';
import { activityRepo } from '@/lib/repositories/activityRepo';
import { blogRepo } from '@/lib/repositories/blogRepo';
import { newsRepo } from '@/lib/repositories/newsRepo';
import { systemLogRepo } from '@/lib/repositories/systemLogRepo';
import { withCache } from '@/lib/cache';
import { parseOptionalDate } from '@/lib/http/query';

export const GET = handle(async (req) => {
    await requireMenuPermission('/admin');
    const url = new URL(req.url);
    const startDate = parseOptionalDate(url.searchParams, 'startDate');
    const endDate = parseOptionalDate(url.searchParams, 'endDate');
    const key = 'dashboard:distribution:' + (startDate ?? 'default') + ':' + (endDate ?? 'default');
    const data = await withCache(key, 5 * 60 * 1000, async () => {
        const [activities, blogs, news, contentStatus, actions, topAuthors] = await Promise.all([
            activityRepo.countAll(startDate, endDate),
            blogRepo.countAll(startDate, endDate),
            newsRepo.countAll(startDate, endDate),
            blogRepo.getContentStatusCount(startDate, endDate),
            systemLogRepo.getActionDistribution(startDate, endDate),
            blogRepo.getTopAuthors(5, startDate, endDate),
        ]);
        return {
            contentTypes: [
                { key: 'activities', label: 'Activities', value: activities },
                { key: 'blogs', label: 'Blogs', value: blogs },
                { key: 'news', label: 'News', value: news },
            ],
            contentStatus,
            actions,
            topAuthors,
            range: { startDate: startDate ?? null, endDate: endDate ?? null },
        };
    });
    return ok(data, 'Dashboard distribution fetched successfully');
});
