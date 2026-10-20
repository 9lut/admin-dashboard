import 'server-only';
import { col, mapDoc, mapQuery, timestamps, touch, Timestamp, FieldValue } from '../firebase/firestore';
import { NotFound } from '../http/response';
import { deleteFile } from '../storage/r2';
import { buildPrayerRoomSlug, englishPrayerRoomName } from '../seo/prayerRoomSlug';

const COLLECTION = 'prayerRooms';

export type PrayerRoomFields = {
    name?: string;
    name_th?: string;
    name_en?: string;
    slug?: string;
    legacySlugs?: string[];
    place?: string;
    detail?: string;
    faculty?: string;
    location?: number[];
    openingHours?: string;
    youtube_url?: string;
    capacity?: number;
    google_map_url?: string;
    facilities?: string[];
    phone?: string;
};

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
    const fallback = base || `prayer-room-${Date.now()}`;
    let candidate = fallback;
    let suffix = 2;
    while (true) {
        const snap = await col(COLLECTION).where('slug', '==', candidate).limit(2).get();
        const taken = snap.docs.some((doc) => doc.id !== excludeId);
        if (!taken) return candidate;
        candidate = `${fallback}-${suffix++}`;
    }
}

export const prayerRoomRepo = {
    async create(fields: PrayerRoomFields, images: string[]) {
        const ref = col(COLLECTION).doc();
        const nameEn = fields.name_en || englishPrayerRoomName(fields.name_th, fields.name);
        const slug = await uniqueSlug(buildPrayerRoomSlug({ ...fields, name_en: nameEn }, `prayer-room-${ref.id.slice(0, 8)}`), ref.id);
        await ref.set({
            name: fields.name_th || fields.name,
            name_th: fields.name_th || fields.name,
            name_en: nameEn,
            slug,
            place: fields.place,
            detail: fields.detail,
            faculty: fields.faculty,
            location: fields.location ?? [],
            openingHours: fields.openingHours,
            youtube_url: fields.youtube_url,
            capacity: fields.capacity,
            google_map_url: fields.google_map_url,
            facilities: fields.facilities ?? [],
            phone: fields.phone,
            images,
            views: 0,
            ...timestamps(),
        });
        return mapDoc(await ref.get());
    },

    async findAll() {
        return mapQuery(col(COLLECTION).orderBy('createdAt', 'desc').limit(500));
    },

    async findOne(id: string, incrementView = false) {
        let snap = await col(COLLECTION).doc(id).get();
        if (!snap.exists) {
            const bySlug = await col(COLLECTION).where('slug', '==', id).limit(1).get();
            snap = bySlug.docs[0] ?? snap;
        }
        if (!snap.exists) {
            const byLegacySlug = await col(COLLECTION).where('legacySlugs', 'array-contains', id).limit(1).get();
            snap = byLegacySlug.docs[0] ?? snap;
        }
        if (!snap.exists) throw NotFound('Prayer room not found');
        const ref = snap.ref;
        if (incrementView) await ref.update({ views: FieldValue.increment(1) }).catch(() => undefined);
        return mapDoc(await ref.get());
    },

    async update(id: string, fields: PrayerRoomFields, newImages: string[] = [], deleteImages: string[] = []) {
        const ref = col(COLLECTION).doc(id);
        const snap = await ref.get();
        if (!snap.exists) throw NotFound('Prayer room not found');
        const current = mapDoc<{ images?: string[]; name?: string; slug?: string; legacySlugs?: string[] }>(snap);

        let images = current.images ?? [];
        // ไม่ลบไฟล์บน R2 ทันที: ประวัติการแก้ไขอาจย้อนกลับมาใช้ · รูปที่ไม่มีใครใช้จัดการที่ "คลังรูป"
        if (deleteImages.length) images = images.filter((img) => !deleteImages.includes(img));
        if (newImages.length) images = [...images, ...newImages];

        const patch: Record<string, unknown> = { images, ...touch() };
        const keys: (keyof PrayerRoomFields)[] = [
            'name', 'name_th', 'name_en', 'place', 'detail', 'faculty', 'location', 'openingHours',
            'youtube_url', 'capacity', 'google_map_url', 'facilities', 'phone',
        ];
        for (const k of keys) if (fields[k] !== undefined) patch[k] = fields[k];
        if (fields.name_th !== undefined) patch.name = fields.name_th;
        if (fields.slug !== undefined || fields.name_en !== undefined || fields.name_th !== undefined) {
            const nameEn = fields.name_en || englishPrayerRoomName(fields.name_th, String(current.name || ''));
            if (nameEn) patch.name_en = nameEn;
            const nextSlug = await uniqueSlug(buildPrayerRoomSlug({ ...fields, name_en: nameEn, name: String(current.name || '') }, `prayer-room-${id.slice(0, 8)}`), id);
            patch.slug = nextSlug;
            if (current.slug && current.slug !== nextSlug) {
                patch.legacySlugs = [...new Set([...(current.legacySlugs ?? []), current.slug])];
            }
        }

        await ref.update(patch);
        return mapDoc(await ref.get());
    },

    async remove(id: string) {
        const ref = col(COLLECTION).doc(id);
        const snap = await ref.get();
        if (!snap.exists) throw NotFound('Prayer room not found');
        const current = mapDoc<{ images?: string[] }>(snap);
        for (const url of current.images ?? []) await deleteFile(url);
        await ref.delete();
    },

    async countAll(startDate?: string, endDate?: string) {
        let query: any = col(COLLECTION);
        if (startDate) query = query.where('createdAt', '>=', Timestamp.fromDate(new Date(startDate)));
        if (endDate) query = query.where('createdAt', '<=', Timestamp.fromDate(new Date(endDate)));
        return (await query.count().get()).data().count;
    },
};
