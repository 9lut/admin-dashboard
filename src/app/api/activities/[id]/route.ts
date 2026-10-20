import { cookies } from 'next/headers';
import { handle, NotFound, ok } from '@/lib/http/response';
import { requireMenuPermission } from '@/lib/auth/guard';
import { activityRepo } from '@/lib/repositories/activityRepo';
import { parseActivity } from '@/lib/inputs/activityInput';
import { isLive } from '@/lib/content/publish';
import { moveToTrash, withRevision } from '@/lib/content/lifecycle';
import { recordView } from '@/lib/content/views';
import { adminMode } from '@/lib/http/content';

export const GET = handle(async (req, { params }) => {
    const { id } = await params;
    // หลังบ้าน (?admin=1): เห็นร่าง และไม่นับยอดวิว
    if (await adminMode(req, '/admin/activity')) return ok(await activityRepo.findOne(id), 'Fetched activity by ID');

    const store = await cookies();
    const cookieName = 'viewed_activity_' + id;
    const hasViewed = store.has(cookieName);
    const activity = await activityRepo.findOne(id, !hasViewed);
    if (!isLive(activity as never, Date.now())) throw NotFound('Activity not found');
    if (!hasViewed) {
        store.set(cookieName, 'true', { maxAge: 60 * 60, httpOnly: true, path: '/' });
        await recordView('activities', activity._id);
    }
    return ok(activity, 'Fetched activity by ID');
});

export const PATCH = handle(async (req, { params }) => {
    const me = await requireMenuPermission('/admin/activity');
    const { id } = await params;
    const { fields, newImages, deleteImages } = await parseActivity(req);
    const updated = await withRevision('activities', id, me.uid, () => activityRepo.update(id, fields, newImages, deleteImages));
    return ok(updated, 'Activity updated successfully');
});

/** ลบ = ย้ายไปถังขยะ (กู้คืนได้ 30 วัน) */
export const DELETE = handle(async (_req, { params }) => {
    const me = await requireMenuPermission('/admin/activity');
    const { id } = await params;
    const r = await moveToTrash('activities', [id], me.uid);
    if (!r.trashed.length) throw NotFound('Activity not found');
    return ok(null, 'Activity moved to trash');
});
