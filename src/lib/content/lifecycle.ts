import 'server-only';
import type { DocumentReference, DocumentSnapshot } from 'firebase-admin/firestore';
import { col, FieldValue, getDb, mapDoc, Timestamp } from '../firebase/firestore';
import { BadRequest, NotFound } from '../http/response';
import { deleteFiles } from '../storage/r2';
import { CONTENT, changedFields, type ContentType } from './types';
import { collectUsage } from './media';
import { getPolicy } from '../storage/retention';

/* ================================================================== */
/*  ประวัติการแก้ไข (revisions)                                        */
/* ================================================================== */
const REVISIONS = 'revisions';
const TRASH = 'trash';
export const MAX_REVISIONS_PER_DOC = 20;
export const TRASH_DAYS = 30;

/** หาเอกสารจาก id หรือ slug (บทความ/กิจกรรม/ห้องละหมาดใช้ slug ในลิงก์ได้) */
export async function resolveDoc(type: ContentType, idOrSlug: string): Promise<DocumentSnapshot | null> {
    const c = col(CONTENT[type].collection);
    const direct = await c.doc(idOrSlug).get();
    if (direct.exists) return direct;
    const q = await c.where('slug', '==', idOrSlug).limit(1).get();
    return q.empty ? null : q.docs[0];
}

async function pruneRevisions(type: ContentType, docId: string) {
    const max = (await getPolicy()).revisionsMax;
    const snap = await col(REVISIONS).where('docKey', '==', `${type}:${docId}`).select('at').get();
    if (snap.size <= max) return;
    const old = snap.docs.sort((a, b) => (b.get('at')?.toMillis?.() ?? 0) - (a.get('at')?.toMillis?.() ?? 0)).slice(max);
    const batch = getDb().batch();
    old.forEach((d) => batch.delete(d.ref));
    await batch.commit();
}

/** เก็บเวอร์ชัน "ก่อนแก้" ถ้ามีฟิลด์เนื้อหาเปลี่ยนจริง */
async function recordRevision(type: ContentType, ref: DocumentReference, before: Record<string, unknown>, after: Record<string, unknown>, by: string, note?: string) {
    const changed = changedFields(before, after);
    if (!changed.length) return;
    await col(REVISIONS).add({
        type,
        docId: ref.id,
        docKey: `${type}:${ref.id}`,
        title: CONTENT[type].title(before),
        before,
        changed,
        by,
        note: note ?? null,
        at: FieldValue.serverTimestamp(),
    });
    await pruneRevisions(type, ref.id);
}

/**
 * ครอบการแก้ไข: อ่านข้อมูลก่อน → แก้ → อ่านหลัง → บันทึกเวอร์ชันก่อนหน้าไว้
 * การบันทึกประวัติพลาด ต้องไม่ทำให้การแก้ไขล้มเหลว
 */
export async function withRevision<T>(type: ContentType, idOrSlug: string, by: string, update: () => Promise<T>): Promise<T> {
    const doc = await resolveDoc(type, idOrSlug);
    const before = doc?.data();
    const result = await update();
    if (doc && before) {
        try {
            const after = (await doc.ref.get()).data() ?? {};
            await recordRevision(type, doc.ref, before, after, by);
        } catch (e) {
            console.error('[revisions] failed to record', e);
        }
    }
    return result;
}

export async function listRevisions(type: ContentType, idOrSlug: string) {
    const doc = await resolveDoc(type, idOrSlug);
    if (!doc) throw NotFound('ไม่พบเนื้อหา');
    const snap = await col(REVISIONS).where('docKey', '==', `${type}:${doc.id}`).get();
    return snap.docs
        .map((d) => {
            const r = mapDoc<{ changed: string[]; by: string; at: string; note?: string; title: string; before: Record<string, unknown> }>(d);
            return { id: r.id, changed: r.changed, by: r.by, at: r.at, note: r.note ?? null, title: r.title, before: r.before };
        })
        .sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

/** ย้อนกลับไปเวอร์ชันที่เลือก — เวอร์ชันปัจจุบันถูกเก็บเป็นประวัติก่อนเสมอ (ย้อนกลับซ้ำได้) */
export async function restoreRevision(revisionId: string, by: string) {
    const rev = await col(REVISIONS).doc(revisionId).get();
    if (!rev.exists) throw NotFound('ไม่พบเวอร์ชันนี้');
    const type = rev.get('type') as ContentType;
    const ref = col(CONTENT[type].collection).doc(rev.get('docId') as string);
    const cur = await ref.get();
    if (!cur.exists) throw BadRequest('เนื้อหานี้ถูกลบไปแล้ว — กู้จากถังขยะก่อน');
    const current = cur.data() ?? {};
    const before = rev.get('before') as Record<string, unknown>;

    // คงยอดวิว/วันที่สร้างปัจจุบัน และ slug เก่าไว้ให้ลิงก์เดิมยังเปิดได้
    const next = { ...before, views: current.views ?? before.views ?? 0, createdAt: current.createdAt ?? before.createdAt, legacySlugs: current.legacySlugs ?? before.legacySlugs ?? [], updatedAt: FieldValue.serverTimestamp() };
    await recordRevision(type, ref, current, next, by, `ก่อนย้อนกลับไปเวอร์ชัน ${revisionId.slice(0, 6)}`);
    await ref.set(next);
    return { type, docId: ref.id };
}

/* ================================================================== */
/*  ถังขยะ (trash)                                                    */
/* ================================================================== */

export type TrashResult = { trashed: string[]; notFound: string[] };

/** ย้ายเนื้อหาไปถังขยะ (ยังไม่ลบรูป) — atomic ต่อชุด */
export async function moveToTrash(type: ContentType, ids: string[], by: string): Promise<TrashResult> {
    const def = CONTENT[type];
    const snaps = await Promise.all([...new Set(ids)].map((id) => resolveDoc(type, id)));
    const found = snaps.filter((s): s is DocumentSnapshot => !!s);
    const foundIds = new Set(found.map((s) => s.id));
    const notFound = [...new Set(ids)].filter((id) => !foundIds.has(id) && !found.some((s) => s.get('slug') === id));

    const expires = Timestamp.fromDate(new Date(Date.now() + (await getPolicy()).trashDays * 86400000));
    const batch = getDb().batch();
    for (const s of found) {
        const data = s.data() ?? {};
        batch.set(col(TRASH).doc(`${type}__${s.id}`), {
            type,
            docId: s.id,
            title: def.title(data),
            image: def.images(data)[0] ?? null,
            data,
            by,
            deletedAt: FieldValue.serverTimestamp(),
            expiresAt: expires,
        });
        batch.delete(s.ref);
    }
    await batch.commit();
    return { trashed: found.map((s) => s.id), notFound };
}

export async function listTrash() {
    const snap = await col(TRASH).orderBy('deletedAt', 'desc').limit(500).get();
    return snap.docs.map((d) => {
        const t = mapDoc<{ type: ContentType; docId: string; title: string; image: string | null; by: string; deletedAt: string; expiresAt: string; data: Record<string, unknown> }>(d);
        return { id: t.id, type: t.type, docId: t.docId, title: t.title, image: t.image, by: t.by, deletedAt: t.deletedAt, expiresAt: t.expiresAt, images: CONTENT[t.type]?.images(t.data).length ?? 0 };
    });
}

/** กู้คืน — ถ้ามีเอกสาร id เดิมอยู่แล้วจะไม่ทับ */
export async function restoreFromTrash(trashIds: string[], allowed: (type: ContentType) => boolean) {
    const restored: string[] = [];
    const skipped: { id: string; reason: string }[] = [];
    for (const id of new Set(trashIds)) {
        const t = await col(TRASH).doc(id).get();
        if (!t.exists) {
            skipped.push({ id, reason: 'ไม่พบในถังขยะ' });
            continue;
        }
        const type = t.get('type') as ContentType;
        if (!allowed(type)) {
            skipped.push({ id, reason: 'ไม่มีสิทธิ์' });
            continue;
        }
        const ref = col(CONTENT[type].collection).doc(t.get('docId') as string);
        if ((await ref.get()).exists) {
            skipped.push({ id, reason: 'มีเนื้อหา id นี้อยู่แล้ว' });
            continue;
        }
        const batch = getDb().batch();
        batch.set(ref, { ...(t.get('data') as Record<string, unknown>), updatedAt: FieldValue.serverTimestamp() });
        batch.delete(t.ref);
        await batch.commit();
        restored.push(id);
    }
    return { restored, skipped };
}

/**
 * ลบถาวร: ลบรายการในถังขยะ + ลบรูปที่ไม่มีเนื้อหาอื่นใช้แล้ว (ตรวจจากการใช้งานทั้งระบบ)
 */
export async function purgeTrash(trashIds: string[], allowed: (type: ContentType) => boolean) {
    const docs = (await Promise.all([...new Set(trashIds)].map((id) => col(TRASH).doc(id).get()))).filter((d) => d.exists && allowed(d.get('type') as ContentType));
    if (!docs.length) return { purged: 0, imagesDeleted: 0 };

    const images = new Set<string>();
    for (const d of docs) CONTENT[d.get('type') as ContentType].images(d.get('data') ?? {}).forEach((u) => images.add(u));

    const batch = getDb().batch();
    docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    // หลังลบรายการแล้ว รูปไหนยังถูกใช้ที่อื่น (เนื้อหา/ประวัติ/ถังขยะรายการอื่น) ห้ามลบ
    let imagesDeleted = 0;
    if (images.size) {
        const usage = await collectUsage();
        const orphan = [...images].filter((u) => !usage.has(u.split('?')[0].split('/').pop() ?? ''));
        if (orphan.length) imagesDeleted = orphan.length - (await deleteFiles(orphan));
    }
    return { purged: docs.length, imagesDeleted };
}

/** ลบถาวรรายการที่อยู่ในถังเกิน 30 วัน (cron รายวัน) */
export async function purgeExpired() {
    const snap = await col(TRASH).where('expiresAt', '<=', Timestamp.now()).limit(200).get();
    return purgeTrash(snap.docs.map((d) => d.id), () => true);
}
