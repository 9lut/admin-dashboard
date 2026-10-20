import { z } from 'zod';
import { handle, ok } from '@/lib/http/response';
import { requireRole, Role } from '@/lib/auth/guard';
import { getPolicy, previewCleanup, runCleanup, savePolicy, storageUsage } from '@/lib/storage/retention';
import { clearCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** ภาพรวมพื้นที่จัดเก็บ + นโยบาย + จำนวนที่จะถูกล้างถ้ากดล้างตอนนี้ (เฉพาะผู้ดูแลสูงสุด) */
export const GET = handle(async (req) => {
    await requireRole(Role.SUPERADMIN);
    if (new URL(req.url).searchParams.get('refresh') === '1') clearCache('storage:usage');
    const policy = await getPolicy();
    const [usage, preview] = await Promise.all([storageUsage(), previewCleanup(policy)]);
    return ok({ policy, usage, preview });
});

const policySchema = z.object({
    logsDays: z.number().int(),
    revisionsMax: z.number().int(),
    revisionsDays: z.number().int(),
    trashDays: z.number().int(),
    viewStatsDays: z.number().int(),
    viewStatsEnabled: z.boolean(),
    dailyStatsDays: z.number().int(),
    r2QuotaGB: z.number(),
    firestoreQuotaMB: z.number(),
    firestoreWritesPerDay: z.number().int(),
});

/** บันทึกนโยบาย (ค่าถูกบีบให้อยู่ในขอบเขตที่ปลอดภัยฝั่ง server) */
export const PUT = handle(async (req) => {
    const me = await requireRole(Role.SUPERADMIN);
    const policy = await savePolicy(policySchema.parse(await req.json()), me.uid);
    return ok({ policy, preview: await previewCleanup(policy) }, 'Policy saved');
});

/** ล้างข้อมูลตามนโยบายตอนนี้ */
export const POST = handle(async () => {
    const me = await requireRole(Role.SUPERADMIN);
    const result = await runCleanup(me.uid);
    return ok(result, 'Cleanup done');
});
