import { ok, failBody } from '@/lib/http/response';
import { runCleanup } from '@/lib/storage/retention';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * ล้างข้อมูลเก่าตามนโยบายพื้นที่จัดเก็บ (บันทึกระบบ ประวัติ สถิติ ถังขยะ)
 * Vercel Cron เรียกวันละครั้ง พร้อม Authorization: Bearer CRON_SECRET
 */
export async function GET(req: Request) {
    const secret = process.env.CRON_SECRET;
    const authorized = secret ? req.headers.get('authorization') === `Bearer ${secret}` : process.env.NODE_ENV === 'development';
    if (!authorized) return failBody('Unauthorized', 401);
    try {
        return ok(await runCleanup('cron'), 'Cleanup done');
    } catch (err) {
        console.error('[cleanup] failed:', err);
        return failBody('Cleanup failed', 500);
    }
}
