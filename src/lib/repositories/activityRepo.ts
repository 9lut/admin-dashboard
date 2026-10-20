import 'server-only';
import { col, mapDoc, timestamps, touch, Timestamp, FieldValue } from '../firebase/firestore';
import { NotFound } from '../http/response';
import { deleteFile } from '../storage/r2';
import { liveOnly } from '../content/publish';

const COLLECTION = 'activities';

export type ActivityFields = {
    name_th?: string;
    name_eng?: string;
    location?: string;
    participants?: number;
    duration?: number | null;
    description?: string;
    objectives?: string[];
    goals?: string[];
    feedbacks?: string[];
    start_date?: Date | null;
    end_date?: Date | null;
    favorite?: boolean;
    /** 'draft' | 'published' — ไม่ส่ง = คงค่าเดิม */
    status?: 'draft' | 'published';
    /** เวลาเผยแพร่ (ตั้งเวลา) — null = ทันที */
    publishAt?: Date | null;
};

type ActivityRaw = {
    name_th: string;
    name_eng: string;
    location: string;
    description?: string;
    favorite?: boolean;
    images?: string[];
    slug?: string;
    start_date?: string | null;
    end_date?: string | null;
    [k: string]: unknown;
};

/** Reduced list shape used by the public/admin lists. */
function toListItem(a: ActivityRaw & { _id: string }) {
    return {
        _id: a._id,
        slug: a.slug || a._id,
        name_th: a.name_th,
        name_eng: a.name_eng,
        location: a.location,
        description: a.description,
        favorite: a.favorite,
        images: a.images && a.images.length > 0 ? a.images[0] : null,
        // ใช้กรองสถานะ/ปีในหน้าแอดมิน (เพิ่มฟิลด์ = ไม่กระทบผู้ใช้เดิม)
        start_date: a.start_date ?? null,
        status: (a.status as string | undefined) ?? 'published',
        publishAt: (a.publishAt as string | undefined) ?? null,
        end_date: a.end_date ?? null,
        createdAt: (a.createdAt as string | undefined) ?? null,
    };
}

function ts(d?: Date | null) {
    return d ? Timestamp.fromDate(d) : null;
}

/**
 * Build a URL slug from the English name (preferred) or the Thai name.
 * Thai characters are valid in URLs and good for SEO, so we keep them.
 */
function slugify(nameEng?: string, nameTh?: string, fallback = ''): string {
    const src = nameEng && /[a-zA-Z]/.test(nameEng) ? nameEng : nameTh || '';
    const slug = src
        .toLowerCase()
        .trim()
        .replace(/[^฀-๿a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || fallback;
}

async function isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const snap = await col(COLLECTION).where('slug', '==', slug).limit(2).get();
    return snap.docs.some((d) => d.id !== excludeId);
}

/** Resolve an activity by Firestore doc id first, then by slug. */
async function resolve(idOrSlug: string) {
    const direct = await col(COLLECTION).doc(idOrSlug).get();
    if (direct.exists) return direct;
    const q = await col(COLLECTION).where('slug', '==', idOrSlug).limit(1).get();
    return q.empty ? null : q.docs[0];
}

export const activityRepo = {
    async create(fields: ActivityFields, images: string[]) {
        const ref = col(COLLECTION).doc(); // pre-generate id for slug fallback

        let slug = slugify(fields.name_eng, fields.name_th, ref.id);
        if (await isSlugTaken(slug)) slug = `${slug}-${ref.id.slice(0, 6)}`;

        await ref.set({
            name_th: fields.name_th,
            name_eng: fields.name_eng,
            location: fields.location,
            participants: fields.participants ?? 0,
            duration: fields.duration ?? null,
            description: fields.description ?? '',
            objectives: fields.objectives ?? [],
            goals: fields.goals ?? [],
            feedbacks: fields.feedbacks ?? [],
            start_date: ts(fields.start_date),
            end_date: ts(fields.end_date),
            favorite: fields.favorite ?? false,
            status: fields.status ?? 'published',
            publishAt: fields.publishAt ? Timestamp.fromDate(fields.publishAt) : null,
            slug,
            images,
            views: 0,
            ...timestamps(),
        });
        return mapDoc(await ref.get());
    },

    async findAll() {
        const snap = await col(COLLECTION).orderBy('createdAt', 'desc').limit(500).get();
        return snap.docs.map((d) => toListItem(mapDoc<ActivityRaw>(d)));
    },

    async findOne(idOrSlug: string, incrementView = false) {
        const doc = await resolve(idOrSlug);
        if (!doc) throw NotFound('Activity not found');
        if (incrementView) await doc.ref.update({ views: FieldValue.increment(1) }).catch(() => undefined);
        return mapDoc(await doc.ref.get());
    },

    async update(id: string, fields: ActivityFields, newImages: string[] = [], deleteImages: string[] = []) {
        const ref = col(COLLECTION).doc(id);
        const snap = await ref.get();
        if (!snap.exists) throw NotFound('Activity not found');
        const current = mapDoc<{ images?: string[] }>(snap);

        let images = current.images ?? [];
        // ไม่ลบไฟล์บน R2 ทันที: ประวัติการแก้ไขอาจย้อนกลับมาใช้ · รูปที่ไม่มีใครใช้จัดการที่ "คลังรูป"
        if (deleteImages.length) images = images.filter((img) => !deleteImages.includes(img));
        if (newImages.length) images = [...images, ...newImages];

        const patch: Record<string, unknown> = { images, ...touch() };
        if (fields.name_th !== undefined) patch.name_th = fields.name_th;
        if (fields.name_eng !== undefined) patch.name_eng = fields.name_eng;
        if (fields.location !== undefined) patch.location = fields.location;
        if (fields.participants !== undefined) patch.participants = fields.participants;
        if (fields.duration !== undefined) patch.duration = fields.duration;
        if (fields.description !== undefined) patch.description = fields.description;
        if (fields.objectives !== undefined) patch.objectives = fields.objectives;
        if (fields.goals !== undefined) patch.goals = fields.goals;
        if (fields.feedbacks !== undefined) patch.feedbacks = fields.feedbacks;
        if (fields.start_date !== undefined) patch.start_date = ts(fields.start_date);
        if (fields.end_date !== undefined) patch.end_date = ts(fields.end_date);
        if (fields.favorite !== undefined) patch.favorite = fields.favorite;
        if (fields.status !== undefined) patch.status = fields.status;
        if (fields.publishAt !== undefined) patch.publishAt = fields.publishAt ? Timestamp.fromDate(fields.publishAt) : null;

        await ref.update(patch);
        return mapDoc(await ref.get());
    },

    async remove(id: string) {
        const ref = col(COLLECTION).doc(id);
        const snap = await ref.get();
        if (!snap.exists) throw NotFound('Activity not found');
        const current = mapDoc<{ images?: string[] }>(snap);
        for (const url of current.images ?? []) await deleteFile(url);
        await ref.delete();
    },

    async getLatestFavorites() {
        const snap = await col(COLLECTION)
            .where('favorite', '==', true)
            .orderBy('updatedAt', 'desc')
            .limit(12)
            .get();
        return liveOnly(snap.docs.map((d) => mapDoc<ActivityRaw>(d)), Date.now()).slice(0, 4).map(toListItem);
    },

    async findActivitiesThisMonth() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
        const snap = await col(COLLECTION)
            .where('start_date', '>=', Timestamp.fromDate(start))
            .where('start_date', '<', Timestamp.fromDate(end))
            .orderBy('start_date', 'asc')
            .get();
        return liveOnly(snap.docs.map((d) => mapDoc<ActivityRaw>(d)), Date.now());
    },

    async getRoadmap() {
        // Firestore allows one inequality field; filter end_date != null in memory.
        const snap = await col(COLLECTION)
            .where('start_date', '!=', null)
            .orderBy('start_date', 'asc')
            .get();
        return liveOnly(snap.docs.map((d) => mapDoc<ActivityRaw>(d)), Date.now()).filter((a) => a.end_date != null);
    },

    async countAll(startDate?: string, endDate?: string) {
        let query: any = col(COLLECTION);
        if (startDate) query = query.where('createdAt', '>=', Timestamp.fromDate(new Date(startDate)));
        if (endDate) query = query.where('createdAt', '<=', Timestamp.fromDate(new Date(endDate)));
        return (await query.count().get()).data().count;
    },

    async getMostViewed(limit = 5) {
        const snap = await col(COLLECTION).orderBy('views', 'desc').limit(limit).get();
        return snap.docs.map((d) => mapDoc(d));
    },
};
