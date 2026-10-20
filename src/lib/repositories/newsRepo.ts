import 'server-only';
import { col, mapDoc, mapQuery, timestamps, touch, Timestamp, FieldValue } from '../firebase/firestore';
import { NotFound } from '../http/response';
import { deleteFile } from '../storage/r2';
import { liveOnly } from '../content/publish';

const COLLECTION = 'news';

export type NewsFields = {
    name?: string;
    date?: Date;
    link?: string;
    description?: string;
    /** 'draft' | 'published' — ไม่ส่ง = คงค่าเดิม */
    status?: 'draft' | 'published';
    /** เวลาเผยแพร่ (ตั้งเวลา) — null = ทันที */
    publishAt?: Date | null;
};

export type NewsSource = { source: string; sourceId: string };

export const newsRepo = {
    async create(fields: NewsFields, images: string[], source?: NewsSource) {
        const ref = await col(COLLECTION).add({
            name: fields.name,
            date: fields.date ? Timestamp.fromDate(fields.date) : null,
            link: fields.link ?? '',
            description: fields.description ?? '',
            images,
            views: 0,
            status: fields.status ?? 'published',
            publishAt: fields.publishAt ? Timestamp.fromDate(fields.publishAt) : null,
            source: source?.source ?? null,
            sourceId: source?.sourceId ?? null,
            // ข่าวที่ดึงอัตโนมัติ (Facebook) ต้องรอแอดมินตรวจก่อน → แสดงในการแจ้งเตือน
            reviewedAt: source ? null : FieldValue.serverTimestamp(),
            ...timestamps(),
        });
        return mapDoc(await ref.get());
    },

    /** True if a news item already exists for this external source id (dedup). */
    async existsBySourceId(sourceId: string) {
        const snap = await col(COLLECTION).where('sourceId', '==', sourceId).limit(1).get();
        return !snap.empty;
    },

    async findAll() {
        return mapQuery(col(COLLECTION).orderBy('createdAt', 'desc').limit(500));
    },

    async getByDateRange(start: Date, end: Date) {
        return mapQuery(
            col(COLLECTION)
                .where('date', '>=', Timestamp.fromDate(start))
                .where('date', '<=', Timestamp.fromDate(end))
                .orderBy('date', 'asc'),
        );
    },

    async getNewsInCurrentMonth() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return this.getByDateRange(start, end);
    },

    async getNewsByMonthAndYear(month: number, year: number) {
        const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
        const end = new Date(year, month, 0, 23, 59, 59, 999);
        return this.getByDateRange(start, end);
    },

    async getLatest(limit = 3) {
        // ดึงเผื่อ แล้วกรองร่าง/ตั้งเวลาออก ให้ได้ครบจำนวน
        const rows = await mapQuery<{ status?: string; publishAt?: string }>(col(COLLECTION).orderBy('date', 'desc').limit(limit * 6));
        return liveOnly(rows, Date.now()).slice(0, limit);
    },

    async getMostViewed(limit = 5) {
        return mapQuery(col(COLLECTION).orderBy('views', 'desc').limit(limit));
    },

    async findOne(id: string, incrementView = false) {
        const ref = col(COLLECTION).doc(id);
        if (incrementView) await ref.update({ views: FieldValue.increment(1) }).catch(() => undefined);
        const snap = await ref.get();
        if (!snap.exists) throw NotFound(`News with id '${id}' not found`);
        return mapDoc(snap);
    },

    async update(id: string, fields: NewsFields, newImages: string[] = [], deleteImages: string[] = []) {
        const ref = col(COLLECTION).doc(id);
        const snap = await ref.get();
        if (!snap.exists) throw NotFound(`News with id '${id}' not found`);
        const current = mapDoc<{ images?: string[] }>(snap);

        let images = current.images ?? [];
        // ไม่ลบไฟล์บน R2 ทันที: ประวัติการแก้ไขอาจย้อนกลับมาใช้ · รูปที่ไม่มีใครใช้จัดการที่ "คลังรูป"
        if (deleteImages.length) images = images.filter((img) => !deleteImages.includes(img));
        if (newImages.length) images = [...images, ...newImages];

        // แก้ไขผ่านหลังบ้าน = ตรวจแล้ว
        const patch: Record<string, unknown> = { images, reviewedAt: FieldValue.serverTimestamp(), ...touch() };
        if (fields.name !== undefined) patch.name = fields.name;
        if (fields.date !== undefined) patch.date = Timestamp.fromDate(fields.date);
        if (fields.link !== undefined) patch.link = fields.link;
        if (fields.description !== undefined) patch.description = fields.description;
        if (fields.status !== undefined) patch.status = fields.status;
        if (fields.publishAt !== undefined) patch.publishAt = fields.publishAt ? Timestamp.fromDate(fields.publishAt) : null;

        await ref.update(patch);
        return mapDoc(await ref.get());
    },

    /** ข่าวที่ดึงอัตโนมัติแต่ยังไม่มีคนตรวจ (ดูย้อนหลัง 30 วัน) */
    async pendingReview(limit = 20) {
        const since = Timestamp.fromDate(new Date(Date.now() - 30 * 86400000));
        const snap = await col(COLLECTION).where('createdAt', '>=', since).orderBy('createdAt', 'desc').limit(200).get();
        return snap.docs
            .filter((d) => d.get('source') && !d.get('reviewedAt'))
            .slice(0, limit)
            .map((d) => mapDoc<{ name: string; source: string; createdAt: string }>(d));
    },

    async markReviewed(id: string) {
        const ref = col(COLLECTION).doc(id);
        if (!(await ref.get()).exists) throw NotFound(`News with id '${id}' not found`);
        await ref.update({ reviewedAt: FieldValue.serverTimestamp() });
    },

    async remove(id: string) {
        const ref = col(COLLECTION).doc(id);
        const snap = await ref.get();
        if (!snap.exists) throw NotFound(`News with id '${id}' not found`);
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
