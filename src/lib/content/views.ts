import 'server-only';
import { col, FieldValue, getDb } from '../firebase/firestore';
import type { ContentType } from './types';
import { getPolicy } from '../storage/retention';

/**
 * สถิติการเข้าชมรายวัน: เอกสาร viewStats/{YYYY-MM-DD} มีแผนที่ counts["type:id"] = จำนวน
 * 1 การเข้าชม = 1 write (เพิ่มค่าในเอกสารของวันนั้น) · อ่านช่วง 30 วัน = 30 reads
 */
const COLLECTION = 'viewStats';

/** วันที่ตามเวลาไทย (ตัดวันตอนเที่ยงคืนไทย ไม่ใช่ UTC) */
export function bangkokDay(t: number): string {
    return new Date(t + 7 * 3600000).toISOString().slice(0, 10);
}

export async function recordView(type: ContentType, id: string) {
    try {
        // ปิดได้ที่หน้า "พื้นที่จัดเก็บ" เมื่อการเขียนข้อมูลใกล้เต็มโควตา (ยอดวิวรวมของเนื้อหายังนับต่อ)
        if (!(await getPolicy()).viewStatsEnabled) return;
        await col(COLLECTION)
            .doc(bangkokDay(Date.now()))
            .set({ counts: { [`${type}:${id}`]: FieldValue.increment(1) }, total: FieldValue.increment(1) }, { merge: true });
    } catch (e) {
        console.error('[views] record failed', e);
    }
}

/** วันย้อนหลัง n วัน (รวมวันนี้) เรียงเก่า → ใหม่ */
export function dayRange(days: number, now = Date.now()): string[] {
    return Array.from({ length: days }, (_, i) => bangkokDay(now - (days - 1 - i) * 86400000));
}

/** อ่านสถิติรายวันในช่วงที่กำหนด → { day: { "type:id": count } } */
export async function readDailyViews(days: number): Promise<Record<string, Record<string, number>>> {
    const range = dayRange(days);
    const snaps = await getDb().getAll(...range.map((d) => col(COLLECTION).doc(d)));
    const out: Record<string, Record<string, number>> = {};
    for (const doc of snaps) out[doc.id] = (doc.exists ? (doc.get('counts') as Record<string, number>) : null) ?? {};
    return out;
}
