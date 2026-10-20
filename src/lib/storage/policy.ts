/**
 * นโยบายการเก็บข้อมูล (retention) — โมดูลบริสุทธิ์ ทดสอบได้
 * เก็บใน Firestore: settings/storage · ระบบล้างข้อมูลเก่าตามนี้ทุกวัน (cron) และกดล้างเองได้ที่หน้า "พื้นที่จัดเก็บ"
 */

export type StoragePolicy = {
    /** เก็บบันทึกระบบกี่วัน */
    logsDays: number;
    /** เก็บประวัติการแก้ไขสูงสุดกี่เวอร์ชันต่อเนื้อหา */
    revisionsMax: number;
    /** ลบประวัติการแก้ไขที่เก่ากว่ากี่วัน */
    revisionsDays: number;
    /** เนื้อหาอยู่ในถังขยะกี่วันก่อนลบถาวร */
    trashDays: number;
    /** เก็บสถิติการเข้าชมรายวันกี่วัน */
    viewStatsDays: number;
    /** เก็บสถิติรายวันหรือไม่ (ปิดได้ถ้าการเขียนข้อมูลใกล้เต็มโควตา) */
    viewStatsEnabled: boolean;
    /** เก็บสถิติการใช้งานหลังบ้าน (dailyStats) กี่วัน */
    dailyStatsDays: number;
    /** โควตาที่ใช้คำนวณเปอร์เซ็นต์ (ตามแพ็กเกจที่ใช้) */
    r2QuotaGB: number;
    firestoreQuotaMB: number;
    firestoreWritesPerDay: number;
};

export const DEFAULT_POLICY: StoragePolicy = {
    logsDays: 90,
    revisionsMax: 20,
    revisionsDays: 180,
    trashDays: 30,
    viewStatsDays: 400,
    viewStatsEnabled: true,
    dailyStatsDays: 400,
    // แพ็กเกจฟรี: R2 10 GB · Firestore 1 GiB · 20,000 writes/วัน
    r2QuotaGB: 10,
    firestoreQuotaMB: 1024,
    firestoreWritesPerDay: 20000,
};

/** ขอบเขตที่อนุญาต [ต่ำสุด, สูงสุด] — กันตั้งค่าผิดจนข้อมูลหายหมดหรือไม่เคยถูกล้าง */
export const LIMITS: Record<Exclude<keyof StoragePolicy, 'viewStatsEnabled'>, [number, number]> = {
    logsDays: [7, 730],
    revisionsMax: [1, 100],
    revisionsDays: [7, 1095],
    trashDays: [1, 90],
    viewStatsDays: [30, 1095],
    dailyStatsDays: [30, 1095],
    r2QuotaGB: [1, 10000],
    firestoreQuotaMB: [100, 1_000_000],
    firestoreWritesPerDay: [1000, 10_000_000],
};

/** รวมค่าที่บันทึกไว้กับค่าเริ่มต้น และบีบให้อยู่ในขอบเขต */
export function normalizePolicy(raw: unknown): StoragePolicy {
    const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const out = { ...DEFAULT_POLICY };
    for (const [k, [min, max]] of Object.entries(LIMITS) as [keyof typeof LIMITS, [number, number]][]) {
        const v = Number(src[k]);
        if (Number.isFinite(v)) out[k] = Math.min(max, Math.max(min, Math.round(v)));
    }
    if (typeof src.viewStatsEnabled === 'boolean') out.viewStatsEnabled = src.viewStatsEnabled;
    return out;
}

/** วันตามเวลาไทย YYYY-MM-DD */
export const bkkDay = (t: number) => new Date(t + 7 * 3600000).toISOString().slice(0, 10);

/** จุดตัด: ข้อมูลที่เก่ากว่านี้จะถูกล้าง */
export function cutoffs(p: StoragePolicy, now: number) {
    const ago = (d: number) => new Date(now - d * 86400000);
    return {
        logsBefore: ago(p.logsDays),
        revisionsBefore: ago(p.revisionsDays),
        trashBefore: ago(p.trashDays),
        viewStatsBeforeDay: bkkDay(now - p.viewStatsDays * 86400000),
        dailyStatsBeforeDay: bkkDay(now - p.dailyStatsDays * 86400000),
    };
}

export type Level = 'ok' | 'warn' | 'danger';
/** ระดับเตือนตามเปอร์เซ็นต์ที่ใช้ */
export const usageLevel = (used: number, quota: number): Level => {
    const r = quota > 0 ? used / quota : 0;
    return r >= 0.9 ? 'danger' : r >= 0.7 ? 'warn' : 'ok';
};

/** ขนาดโดยประมาณของเอกสาร Firestore (ใกล้เคียงวิธีคิดของ Firestore: ชื่อฟิลด์ + ค่า + 32 ไบต์ต่อเอกสาร) */
export function estimateDocBytes(value: unknown): number {
    const size = (v: unknown): number => {
        if (v === null || v === undefined) return 1;
        if (typeof v === 'boolean') return 1;
        if (typeof v === 'number') return 8;
        if (typeof v === 'string') return Buffer.byteLength(v, 'utf8') + 1;
        if (v instanceof Date || (typeof v === 'object' && 'toDate' in (v as object))) return 8;
        if (Array.isArray(v)) return v.reduce((s: number, x) => s + size(x), 0);
        if (typeof v === 'object') return Object.entries(v as Record<string, unknown>).reduce((s, [k, x]) => s + Buffer.byteLength(k, 'utf8') + 1 + size(x), 0);
        return 8;
    };
    return size(value) + 32;
}
