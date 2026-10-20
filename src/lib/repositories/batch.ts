import 'server-only';
import { getDb } from '../firebase/admin';
import { deleteFiles } from '../storage/r2';

export const MAX_BATCH = 100;

export type BatchResult = { deleted: string[]; notFound: string[]; imageErrors: number };

/**
 * ลบเอกสารหลายรายการในคอลเลกชันที่เก็บรูปไว้ในฟิลด์ (array หรือ string)
 * 1) อ่านทุกเอกสารพร้อมกัน (getAll) 2) ลบรูปทั้งหมดบน R2 ในคำขอเดียว 3) ลบเอกสารใน batch เดียว (atomic)
 */
export async function removeMany(
    collection: string,
    ids: string[],
    imagesOf: (data: Record<string, unknown>) => string[],
): Promise<BatchResult> {
    const unique = [...new Set(ids)].slice(0, MAX_BATCH);
    if (!unique.length) return { deleted: [], notFound: [], imageErrors: 0 };

    const db = getDb();
    const refs = unique.map((id) => db.collection(collection).doc(id));
    const snaps = await db.getAll(...refs);

    const found = snaps.filter((s) => s.exists);
    const notFound = snaps.filter((s) => !s.exists).map((s) => s.id);
    const images = found.flatMap((s) => imagesOf(s.data() ?? {}));

    const batch = db.batch();
    for (const s of found) batch.delete(s.ref);
    await batch.commit();

    // ลบรูปหลังลบเอกสารสำเร็จ — ถ้าลบเอกสารพลาด รูปยังอยู่ครบ
    const imageErrors = images.length ? await deleteFiles(images) : 0;
    return { deleted: found.map((s) => s.id), notFound, imageErrors };
}

export { blogImages, imagesField } from '../inputs/images';
