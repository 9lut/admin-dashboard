import { handle, ok } from '@/lib/http/response';
import { requireMenuPermission } from '@/lib/auth/guard';
import { accountRepo } from '@/lib/repositories/accountRepo';
import { activityRepo } from '@/lib/repositories/activityRepo';
import { blogRepo } from '@/lib/repositories/blogRepo';
import { newsRepo } from '@/lib/repositories/newsRepo';
import { prayerRoomRepo } from '@/lib/repositories/prayerRoomRepo';
import { withCache } from '@/lib/cache';
import { parseOptionalDate } from '@/lib/http/query';

const SUMMARY_TTL = 5 * 60 * 1000;

type SummaryCounts = {
    users: number;
    activities: number;
    news: number;
    blogs: number;
    prayerRooms: number;
};

const countAll = (startDate?: string, endDate?: string): Promise<SummaryCounts> =>
    Promise.all([
        accountRepo.countAll(startDate, endDate),
        activityRepo.countAll(startDate, endDate),
        newsRepo.countAll(startDate, endDate),
        blogRepo.countAll(startDate, endDate),
        prayerRoomRepo.countAll(startDate, endDate),
    ]).then(([users, activities, news, blogs, prayerRooms]) => ({
        users,
        activities,
        news,
        blogs,
        prayerRooms,
    }));

export const GET = handle(async (req) => {
    await requireMenuPermission('/admin');

    const url = new URL(req.url);
    const startDate = parseOptionalDate(url.searchParams, 'startDate');
    const endDate = parseOptionalDate(url.searchParams, 'endDate');
    const cacheKey = 'dashboard:summary:' + (startDate ?? 'all') + ':' + (endDate ?? 'all');

    const data = await withCache(cacheKey, SUMMARY_TTL, async () => {
        const totals = await countAll();
        if (!startDate) {
            return { totals, period: null, comparison: null, range: null };
        }

        const currentEnd = endDate ? new Date(endDate) : new Date();
        const currentStart = new Date(startDate);
        const duration = Math.max(currentEnd.getTime() - currentStart.getTime(), 0);
        const previousEnd = new Date(currentStart.getTime() - 1);
        const previousStart = new Date(previousEnd.getTime() - duration);
        const previousStartIso = previousStart.toISOString();
        const previousEndIso = previousEnd.toISOString();

        const [period, previous] = await Promise.all([
            countAll(startDate, endDate),
            countAll(previousStartIso, previousEndIso),
        ]);

        const comparison = Object.fromEntries(
            Object.keys(totals).map((key) => {
                const current = period[key as keyof SummaryCounts];
                const prior = previous[key as keyof SummaryCounts];
                return [key, prior === 0 ? (current === 0 ? 0 : null) : Number((((current - prior) / prior) * 100).toFixed(1))];
            }),
        );

        return {
            totals,
            period,
            comparison,
            range: {
                startDate,
                endDate: endDate ?? currentEnd.toISOString(),
                previousStartDate: previousStartIso,
                previousEndDate: previousEndIso,
            },
        };
    });

    return ok(data, 'Dashboard summary fetched successfully');
});
