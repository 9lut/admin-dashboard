import 'server-only';
import { FieldPath, type Query } from 'firebase-admin/firestore';
import { col, getDb, Timestamp } from '../firebase/firestore';
import { clearCache, withCache } from '../cache';
import { cutoffs, estimateDocBytes, normalizePolicy, type StoragePolicy } from './policy';
import { listAllObjects } from './r2';
import { purgeTrash } from '../content/lifecycle';
import { OWN_KEY } from '../content/media';

const SETTINGS = col('settings');
const POLICY_DOC = 'storage';

/* ------------------------------------------------------------------ */
/*  นโยบาย                                                            */
/* ------------------------------------------------------------------ */

/** นโยบายปัจจุบัน (แคช 5 นาที — ถูกเรียกทุกครั้งที่มีคนเปิดหน้าเว็บ ผ่าน recordView) */
export const getPolicy = () =>
    withCache('storage:policy', 300_000, async () => {
        const doc = await SETTINGS.doc(POLICY_DOC).get();
        return normalizePolicy(doc.exists ? doc.get('policy') : null);
    });

export async function savePolicy(input: unknown, by: string): Promise<StoragePolicy> {
    const policy = normalizePolicy(input);
    await SETTINGS.doc(POLICY_DOC).set({ policy, policyUpdatedBy: by, policyUpdatedAt: Timestamp.now() }, { merge: true });
    clearCache('storage:');
    return policy;
}

/* ------------------------------------------------------------------ */
/*  ข้อมูลที่จะถูกล้าง                                                  */
/* ------------------------------------------------------------------ */

type Target = { key: string; label: string; query: (p: StoragePolicy, now: number) => Query };

const TARGETS: Target[] = [
    { key: 'systemLogs', label: 'บันทึกระบบ', query: (p, n) => col('systemLogs').where('createdAt', '<', Timestamp.fromDate(cutoffs(p, n).logsBefore)) },
    { key: 'revisions', label: 'ประวัติการแก้ไข', query: (p, n) => col('revisions').where('at', '<', Timestamp.fromDate(cutoffs(p, n).revisionsBefore)) },
    { key: 'viewStats', label: 'สถิติการเข้าชมรายวัน', query: (p, n) => col('viewStats').where(FieldPath.documentId(), '<', cutoffs(p, n).viewStatsBeforeDay) },
    { key: 'dailyStats', label: 'สถิติการใช้งานหลังบ้าน', query: (p, n) => col('dailyStats').where(FieldPath.documentId(), '<', cutoffs(p, n).dailyStatsBeforeDay) },
];

/** ตัวอย่างก่อนล้าง: แต่ละส่วนจะถูกลบกี่รายการ (ใช้ count — ไม่อ่านเอกสารทั้งหมด) */
export async function previewCleanup(p: StoragePolicy, now = Date.now()) {
    const c = cutoffs(p, now);
    const [rows, trash] = await Promise.all([
        Promise.all(TARGETS.map(async (t) => ({ key: t.key, label: t.label, count: (await t.query(p, now).count().get()).data().count }))),
        col('trash').where('deletedAt', '<', Timestamp.fromDate(c.trashBefore)).count().get(),
    ]);
    return [...rows, { key: 'trash', label: 'ถังขยะที่ครบกำหนด', count: trash.data().count }];
}

const BATCH = 400;

/** ลบตาม query เป็นชุด ๆ จนหมดหรือถึงเพดาน (กันเกินเวลา serverless) */
async function deleteByQuery(q: Query, cap: number): Promise<number> {
    let deleted = 0;
    while (deleted < cap) {
        const snap = await q.limit(Math.min(BATCH, cap - deleted)).select().get();
        if (snap.empty) break;
        const batch = getDb().batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        deleted += snap.size;
        if (snap.size < BATCH) break;
    }
    return deleted;
}

/** ตัดประวัติให้เหลือไม่เกิน revisionsMax ต่อเนื้อหา */
async function pruneRevisionsOverMax(max: number, cap: number): Promise<number> {
    const snap = await col('revisions').select('docKey', 'at').get();
    const groups = new Map<string, { ref: FirebaseFirestore.DocumentReference; at: number }[]>();
    for (const d of snap.docs) {
        const k = d.get('docKey') as string;
        const list = groups.get(k) ?? [];
        list.push({ ref: d.ref, at: d.get('at')?.toMillis?.() ?? 0 });
        groups.set(k, list);
    }
    const extra = [...groups.values()].flatMap((l) => l.sort((a, b) => b.at - a.at).slice(max)).slice(0, cap);
    for (let i = 0; i < extra.length; i += BATCH) {
        const batch = getDb().batch();
        extra.slice(i, i + BATCH).forEach((x) => batch.delete(x.ref));
        await batch.commit();
    }
    return extra.length;
}

export type CleanupResult = Record<string, number> & { imagesDeleted: number };

/**
 * ล้างข้อมูลตามนโยบาย — เรียกจาก cron ทุกวัน หรือกดเองที่หน้า "พื้นที่จัดเก็บ"
 * จำกัดจำนวนลบต่อรอบ (cap) — ข้อมูลที่ค้างจะถูกล้างต่อในรอบถัดไป
 */
export async function runCleanup(by: string, cap = 3000): Promise<CleanupResult> {
    const p = await getPolicy();
    const now = Date.now();
    const result: Record<string, number> = {};
    for (const t of TARGETS) result[t.key] = await deleteByQuery(t.query(p, now), cap);
    result.revisionsOverMax = await pruneRevisionsOverMax(p.revisionsMax, cap);

    // ถังขยะที่เก่ากว่ากำหนด (ใช้ deletedAt — เปลี่ยนนโยบายแล้วมีผลกับรายการเดิมด้วย)
    const expired = await col('trash').where('deletedAt', '<', Timestamp.fromDate(cutoffs(p, now).trashBefore)).limit(200).select().get();
    const purge = expired.empty ? { purged: 0, imagesDeleted: 0 } : await purgeTrash(expired.docs.map((d) => d.id), () => true);
    result.trash = purge.purged;

    await SETTINGS.doc(POLICY_DOC).set({ lastCleanup: { at: Timestamp.now(), by, result: { ...result, imagesDeleted: purge.imagesDeleted } } }, { merge: true });
    clearCache('storage:');
    clearCache('media:');
    return { ...result, imagesDeleted: purge.imagesDeleted } as CleanupResult;
}

/* ------------------------------------------------------------------ */
/*  การใช้งานพื้นที่                                                    */
/* ------------------------------------------------------------------ */

export const COLLECTIONS: { key: string; label: string; group: 'content' | 'system' | 'history' }[] = [
    { key: 'news', label: 'ข่าวสาร', group: 'content' },
    { key: 'activities', label: 'กิจกรรม', group: 'content' },
    { key: 'blogs', label: 'บทความ', group: 'content' },
    { key: 'prayerRooms', label: 'ห้องละหมาด', group: 'content' },
    { key: 'accounts', label: 'บัญชีผู้ใช้', group: 'content' },
    { key: 'settings', label: 'ตั้งค่า', group: 'content' },
    { key: 'systemLogs', label: 'บันทึกระบบ', group: 'system' },
    { key: 'dailyStats', label: 'สถิติการใช้งานหลังบ้าน', group: 'system' },
    { key: 'viewStats', label: 'สถิติการเข้าชมรายวัน', group: 'system' },
    { key: 'revisions', label: 'ประวัติการแก้ไข', group: 'history' },
    { key: 'trash', label: 'ถังขยะ', group: 'history' },
];

/** ขนาดเฉลี่ยจากตัวอย่างเอกสารล่าสุด × จำนวน = ขนาดโดยประมาณ (อ่านแค่ไม่กี่สิบเอกสาร) */
async function collectionUsage(key: string) {
    const c = col(key);
    const [count, sample] = await Promise.all([c.count().get(), c.limit(25).get()]);
    const n = count.data().count;
    const avg = sample.size ? sample.docs.reduce((s, d) => s + estimateDocBytes(d.data()) + d.id.length, 0) / sample.size : 0;
    return { count: n, bytes: Math.round(avg * n * 1.3) }; // +30% เผื่อ index อัตโนมัติ
}

/** การเขียนข้อมูลวันนี้โดยประมาณ (การเข้าชม × 2 + การกระทำในระบบ × 2) */
async function writesToday(day: string) {
    const [views, daily] = await Promise.all([col('viewStats').doc(day).get(), col('dailyStats').doc(day).get()]);
    const viewCount = Number(views.get('total') ?? 0);
    const actions = Object.values((daily.get('actions') as Record<string, number>) ?? {}).reduce((a, b) => a + Number(b), 0);
    return { views: viewCount, actions, writes: viewCount * 2 + actions * 2 };
}

export async function storageUsage() {
    return withCache('storage:usage', 600_000, async () => {
        const day = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
        const [cols, objects, writes, meta] = await Promise.all([
            Promise.all(COLLECTIONS.map(async (c) => ({ ...c, ...(await collectionUsage(c.key)) }))),
            listAllObjects(),
            writesToday(day),
            SETTINGS.doc(POLICY_DOC).get(),
        ]);
        const own = objects.filter((o) => OWN_KEY.test(o.key));
        return {
            firestore: { collections: cols, bytes: cols.reduce((s, c) => s + c.bytes, 0), docs: cols.reduce((s, c) => s + c.count, 0) },
            r2: { objects: objects.length, bytes: objects.reduce((s, o) => s + o.size, 0), ownObjects: own.length, ownBytes: own.reduce((s, o) => s + o.size, 0) },
            today: writes,
            lastCleanup: meta.get('lastCleanup') ? { ...meta.get('lastCleanup'), at: meta.get('lastCleanup').at?.toDate?.().toISOString() ?? null } : null,
            measuredAt: new Date().toISOString(),
        };
    });
}
