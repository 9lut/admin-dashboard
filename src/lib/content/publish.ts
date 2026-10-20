/**
 * สถานะการเผยแพร่ (ร่าง / ตั้งเวลา / เผยแพร่) — โมดูลบริสุทธิ์
 *
 * เก็บใน Firestore 2 ฟิลด์: status ('draft' | 'published') และ publishAt (เวลา หรือ null)
 * - ไม่มี status (ข้อมูลเก่า) = เผยแพร่แล้ว
 * - published + publishAt ในอนาคต = "ตั้งเวลา" → ขึ้นเว็บเองเมื่อถึงเวลา (คำนวณตอนอ่าน ไม่ต้องมี cron)
 */

export type PublishState = 'draft' | 'scheduled' | 'published';

type Doc = { status?: unknown; publishAt?: unknown };

const time = (v: unknown): number | null => {
    if (!v) return null;
    if (typeof v === 'object' && v && 'toDate' in v) return (v as { toDate: () => Date }).toDate().getTime();
    const t = new Date(v as string).getTime();
    return Number.isNaN(t) ? null : t;
};

export function publishState(d: Doc, now: number): PublishState {
    if (d.status === 'draft') return 'draft';
    const at = time(d.publishAt);
    return at && at > now ? 'scheduled' : 'published';
}

/** แสดงบนเว็บสาธารณะได้หรือยัง */
export const isLive = (d: Doc, now: number) => publishState(d, now) === 'published';

export class PublishInputError extends Error {}

/**
 * แปลงค่าจากฟอร์ม → ฟิลด์ที่บันทึก
 * state: 'published' (ทันที) | 'scheduled' (ต้องมีเวลาในอนาคต) | 'draft'
 * คืน undefined เมื่อไม่ได้ส่ง state มา (คงค่าเดิมตอนแก้ไข)
 */
export function parsePublishInput(state: unknown, publishAt: unknown, now: number): { status: 'draft' | 'published'; publishAt: Date | null } | undefined {
    if (state === undefined || state === null || state === '') return undefined;
    if (state === 'draft') return { status: 'draft', publishAt: null };
    if (state === 'published') return { status: 'published', publishAt: null };
    if (state === 'scheduled') {
        const t = time(publishAt);
        if (!t) throw new PublishInputError('กรุณาเลือกเวลาเผยแพร่');
        if (t <= now) throw new PublishInputError('เวลาเผยแพร่ต้องอยู่ในอนาคต');
        return { status: 'published', publishAt: new Date(t) };
    }
    throw new PublishInputError('สถานะเผยแพร่ไม่ถูกต้อง');
}

/** กรองเฉพาะรายการที่ขึ้นเว็บแล้ว */
export const liveOnly = <T extends object>(rows: T[], now: number): T[] => rows.filter((r) => isLive(r as Doc, now));
