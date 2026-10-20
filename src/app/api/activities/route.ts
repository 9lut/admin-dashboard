import { handle, ok } from '@/lib/http/response';
import { requireMenuPermission } from '@/lib/auth/guard';
import { activityRepo } from '@/lib/repositories/activityRepo';
import { parseActivity } from '@/lib/inputs/activityInput';
import { withCache } from '@/lib/cache';
import { liveOnly } from '@/lib/content/publish';
import { adminMode } from '@/lib/http/content';

export const GET = handle(async (req) => {
    const admin = await adminMode(req, '/admin/activity');
    const activities = await withCache('api_activities_all', 120000, () => activityRepo.findAll());
    // หลังบ้านเห็นทุกสถานะ · เว็บสาธารณะเห็นเฉพาะที่เผยแพร่แล้ว
    return ok(admin ? activities : liveOnly(activities, Date.now()), 'Fetched all activities');
});

export const POST = handle(async (req) => {
    await requireMenuPermission('/admin/activity');
    const { fields, newImages } = await parseActivity(req);
    const created = await activityRepo.create(fields, newImages);
    return ok(created, 'Activity created successfully', 201);
});
