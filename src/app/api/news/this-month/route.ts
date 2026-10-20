import { handle, ok } from '@/lib/http/response';
import { newsRepo } from '@/lib/repositories/newsRepo';
import { liveOnly } from '@/lib/content/publish';

export const GET = handle(async () => {
    const data = await newsRepo.getNewsInCurrentMonth();
    return ok(liveOnly(data, Date.now()), 'Fetched news in current month');
});
