/**
 * กติกาและ schema ของบัญชีผู้ใช้ — โมดูลบริสุทธิ์ (ไม่แตะฐานข้อมูล) จึงทดสอบได้ตรง ๆ
 * ห้าม import ผ่าน "@/" ที่นี่ เพื่อให้ node --test โหลดได้
 */
import { z } from 'zod';

export const ROLES = ['user', 'admin', 'superadmin'] as const;
export type AccountRole = (typeof ROLES)[number];

const departments = z.array(z.string().trim().min(1).max(60)).max(20);
const name = z.string().trim().min(1).max(60);

export const createAccountSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    /** ไม่ส่ง = ระบบสร้างรหัสผ่านชั่วคราวให้ (ผู้ใช้ต้องเปลี่ยนเมื่อเข้าครั้งแรก) */
    password: z.string().min(8).max(128).optional(),
    firstName: name,
    lastName: name,
    phoneNumber: z.string().trim().max(20).optional(),
    role: z.enum(ROLES).optional(),
    departments: departments.optional(),
});

export const updateAccountSchema = z.object({
    email: z.string().trim().toLowerCase().email().optional(),
    firstName: name.optional(),
    lastName: name.optional(),
    phoneNumber: z.string().trim().max(20).optional(),
    password: z.string().min(8).max(128).optional(),
    role: z.enum(ROLES).optional(),
    departments: departments.optional(),
});

export const roleSchema = z.object({ role: z.enum(ROLES) });

export const bulkSchema = z.discriminatedUnion('action', [
    z.object({ action: z.literal('add-department'), ids: z.array(z.string().min(1).max(200)).min(1).max(200), value: z.string().trim().min(1).max(60) }),
    z.object({ action: z.literal('remove-department'), ids: z.array(z.string().min(1).max(200)).min(1).max(200), value: z.string().trim().min(1).max(60) }),
    z.object({ action: z.literal('set-role'), ids: z.array(z.string().min(1).max(200)).min(1).max(200), value: z.enum(ROLES) }),
]);

const PW_CHARS = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/**
 * รหัสผ่านชั่วคราวที่อ่าน/พิมพ์ง่าย (ตัดตัวที่สับสน เช่น 0/O, 1/l) รูปแบบ xxxx-xxxx-xxxx
 * ใช้ crypto.getRandomValues + rejection sampling ให้แต่ละตัวมีโอกาสเท่ากัน
 */
export function generateTempPassword(groups = 3, size = 4): string {
    const out: string[] = [];
    const limit = 256 - (256 % PW_CHARS.length);
    while (out.length < groups * size) {
        const buf = new Uint8Array(32);
        globalThis.crypto.getRandomValues(buf);
        for (const b of buf) if (b < limit && out.length < groups * size) out.push(PW_CHARS[b % PW_CHARS.length]);
    }
    return Array.from({ length: groups }, (_, g) => out.slice(g * size, g * size + size).join('')).join('-');
}

/** ตัดฝ่ายซ้ำ (เรียงตามที่ส่งมา) */
export const uniqueDepartments = (list?: string[]) => (list ? [...new Set(list.map((d) => d.trim()).filter(Boolean))] : undefined);

/**
 * ตรวจการเปลี่ยนแปลงที่อันตรายต่อผู้ทำรายการเอง — คืนข้อความผิดพลาด หรือ null ถ้าทำได้
 * - ห้ามลดบทบาทตัวเองจาก superadmin (ล็อกตัวเองออกจากระบบจัดการ)
 * - ห้ามลบบัญชีตัวเอง
 */
export function selfChangeError(o: { actorId: string; targetId: string; newRole?: AccountRole; deleting?: boolean }): string | null {
    if (o.actorId !== o.targetId) return null;
    if (o.deleting) return 'ไม่สามารถลบบัญชีของตัวเองได้';
    if (o.newRole && o.newRole !== 'superadmin') return 'ไม่สามารถลดบทบาทของตัวเองได้';
    return null;
}
