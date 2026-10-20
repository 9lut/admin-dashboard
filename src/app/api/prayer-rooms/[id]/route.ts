import { cookies } from 'next/headers';
import { handle, NotFound, ok } from '@/lib/http/response';
import { requireMenuPermission } from '@/lib/auth/guard';
import { prayerRoomRepo } from '@/lib/repositories/prayerRoomRepo';
import { parsePrayerRoom } from '@/lib/inputs/prayerRoomInput';
import { moveToTrash, withRevision } from '@/lib/content/lifecycle';
import { recordView } from '@/lib/content/views';
import { adminMode } from '@/lib/http/content';

export const GET = handle(async (req, { params }) => {
    const { id } = await params;
    if (await adminMode(req, '/admin/prayer-rooms')) return ok(await prayerRoomRepo.findOne(id), 'Fetched prayer room by ID');

    const store = await cookies();
    const cookieName = 'viewed_prayer_room_' + id;
    const hasViewed = store.has(cookieName);
    const room = await prayerRoomRepo.findOne(id, !hasViewed);
    if (!hasViewed) {
        store.set(cookieName, 'true', { maxAge: 60 * 60, httpOnly: true, path: '/' });
        await recordView('prayer-rooms', room._id);
    }
    return ok(room, 'Fetched prayer room by ID');
});

export const PUT = handle(async (req, { params }) => {
    const me = await requireMenuPermission('/admin/prayer-rooms');
    const { id } = await params;
    const { fields, newImages, deleteImages } = await parsePrayerRoom(req);
    const updated = await withRevision('prayer-rooms', id, me.uid, () => prayerRoomRepo.update(id, fields, newImages, deleteImages));
    return ok(updated, 'Prayer room updated successfully');
});

/** ลบ = ย้ายไปถังขยะ (กู้คืนได้ 30 วัน) */
export const DELETE = handle(async (_req, { params }) => {
    const me = await requireMenuPermission('/admin/prayer-rooms');
    const { id } = await params;
    const r = await moveToTrash('prayer-rooms', [id], me.uid);
    if (!r.trashed.length) throw NotFound('Prayer room not found');
    return ok(null, 'Prayer room moved to trash');
});
