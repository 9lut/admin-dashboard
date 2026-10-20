import { handle, ok } from '@/lib/http/response';
import { requireMenuPermission } from '@/lib/auth/guard';
import { activityRepo } from '@/lib/repositories/activityRepo';
import { blogRepo } from '@/lib/repositories/blogRepo';
import { newsRepo } from '@/lib/repositories/newsRepo';
import { systemLogRepo } from '@/lib/repositories/systemLogRepo';
import { withCache } from '@/lib/cache';
import { parseOptionalDate } from '@/lib/http/query';

const CHARTS_TTL = 5 * 60 * 1000; // 5 minutes

export const GET = handle(async (req) => {
    await requireMenuPermission('/admin');
    
    const url = new URL(req.url);
    const startDate = parseOptionalDate(url.searchParams, 'startDate');
    const endDate = parseOptionalDate(url.searchParams, 'endDate');

    const cacheKey = `dashboard:charts:${startDate ?? 'all'}:${endDate ?? 'all'}`;

    const data = await withCache(cacheKey, CHARTS_TTL, async () => {
        const [systemActivity, loginActivity, activitiesCount, blogsCount, newsCount, contentStatus, actionDistribution, topAuthors] = await Promise.all([
            systemLogRepo.getSystemActivity(startDate, endDate),
            systemLogRepo.getLoginActivity(startDate, endDate),
            activityRepo.countAll(startDate, endDate),
            blogRepo.countAll(startDate, endDate),
            newsRepo.countAll(startDate, endDate),
            blogRepo.getContentStatusCount(startDate, endDate),
            systemLogRepo.getActionDistribution(startDate, endDate),
            blogRepo.getTopAuthors(5, startDate, endDate)
        ]);

        return {
            systemActivity,
            loginActivity,
            contentDistribution: [
                { name: 'Activities', value: activitiesCount },
                { name: 'Blogs', value: blogsCount },
                { name: 'News', value: newsCount },
            ],
            contentStatus,
            actionDistribution,
            topAuthors
        };
    });

    return ok(data, 'Fetched dashboard charts');
});
