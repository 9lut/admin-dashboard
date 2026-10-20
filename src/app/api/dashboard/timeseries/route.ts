import { handle, ok } from '@/lib/http/response';
import { requireMenuPermission } from '@/lib/auth/guard';
import { systemLogRepo } from '@/lib/repositories/systemLogRepo';
import { withCache } from '@/lib/cache';
import { parseOptionalDate } from '@/lib/http/query';

export const GET = handle(async (req) => {
    await requireMenuPermission('/admin');
    const url = new URL(req.url);
    const startDate = parseOptionalDate(url.searchParams, 'startDate');
    const endDate = parseOptionalDate(url.searchParams, 'endDate');
    const key = 'dashboard:timeseries:' + (startDate ?? 'default') + ':' + (endDate ?? 'default');
    const data = await withCache(key, 5 * 60 * 1000, async () => {
        // The new dashboard API treats an omitted range as “all time”.
        const effectiveStartDate = startDate ?? '1970-01-01';
        const [loginActivity, systemActivity] = await Promise.all([
            systemLogRepo.getLoginActivity(effectiveStartDate, endDate),
            systemLogRepo.getSystemActivity(effectiveStartDate, endDate),
        ]);
        return {
            loginActivity,
            systemActivity,
            range: { startDate: startDate ?? null, endDate: endDate ?? null },
        };
    });
    return ok(data, 'Dashboard timeseries fetched successfully');
});
