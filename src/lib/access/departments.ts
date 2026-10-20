/**
 * กติกาการจัดการ "ฝ่าย" แบบบริสุทธิ์ (ไม่แตะฐานข้อมูล) — permissionRepo เรียกใช้ และทดสอบได้ตรง ๆ
 */
import { cleanMenuIds, type DepartmentMap } from './menus.ts';

export const MAX_DEPARTMENT_NAME = 50;

export class DepartmentError extends Error {}

/** ชื่อฝ่าย: ตัดช่องว่างซ้ำ ห้ามว่าง/ยาวเกิน/มีอักขระที่ Firestore ใช้เป็นตัวคั่น path */
export function normalizeDepartmentName(raw: string): string {
    const name = String(raw ?? '').trim().replace(/\s+/g, ' ');
    if (!name) throw new DepartmentError('กรุณาระบุชื่อฝ่าย');
    if (name.length > MAX_DEPARTMENT_NAME) throw new DepartmentError(`ชื่อฝ่ายยาวเกิน ${MAX_DEPARTMENT_NAME} ตัวอักษร`);
    if (/[.~*/[\]]/.test(name)) throw new DepartmentError('ชื่อฝ่ายห้ามมีอักขระ . ~ * / [ ]');
    return name;
}

/** ทำความสะอาดทั้งแผนที่: ชื่อฝ่ายถูกต้อง · เมนูเฉพาะที่มอบได้ · ชื่อซ้ำหลัง normalize = error */
export function cleanDepartmentMap(map: DepartmentMap): DepartmentMap {
    const out: DepartmentMap = {};
    for (const [raw, ids] of Object.entries(map ?? {})) {
        const name = normalizeDepartmentName(raw);
        if (name in out) throw new DepartmentError(`ชื่อฝ่ายซ้ำกัน: ${name}`);
        out[name] = cleanMenuIds(Array.isArray(ids) ? ids : []);
    }
    return out;
}

/** เปลี่ยนชื่อฝ่ายในแผนที่ (รักษาลำดับเดิม) */
export function renameInMap(map: DepartmentMap, fromRaw: string, toRaw: string): DepartmentMap {
    const from = String(fromRaw).trim();
    const to = normalizeDepartmentName(toRaw);
    if (!(from in map)) throw new DepartmentError('ไม่พบฝ่ายนี้');
    if (from !== to && to in map) throw new DepartmentError('มีฝ่ายชื่อนี้อยู่แล้ว');
    const out: DepartmentMap = {};
    for (const [k, v] of Object.entries(map)) out[k === from ? to : k] = v;
    return out;
}

export function removeFromMap(map: DepartmentMap, nameRaw: string): DepartmentMap {
    const name = String(nameRaw).trim();
    if (!(name in map)) throw new DepartmentError('ไม่พบฝ่ายนี้');
    const out = { ...map };
    delete out[name];
    return out;
}

/** เปลี่ยนชื่อฝ่ายในรายการฝ่ายของผู้ใช้ (กันชื่อซ้ำ) */
export function renameInList(list: string[], from: string, to: string): string[] {
    return [...new Set(list.map((x) => (x === from ? to : x)))];
}
