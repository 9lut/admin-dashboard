import { getDb } from '@/lib/firebase/admin';
import { FieldValue } from '@/lib/firebase/firestore';
import { BadRequest, NotFound } from '@/lib/http/response';
import { cleanDepartmentMap, DepartmentError, normalizeDepartmentName, removeFromMap, renameInList, renameInMap } from '@/lib/access/departments';

export interface DepartmentPermissions {
    [departmentName: string]: string[]; // array of allowed hrefs (menu links)
}

export interface PermissionSettings {
    departments: DepartmentPermissions;
}

const COLLECTION = 'settings';
const DOC_ID = 'permissions';
const ACCOUNTS = 'accounts';

export { MAX_DEPARTMENT_NAME } from '@/lib/access/departments';

/** แปลง DepartmentError (ข้อความภาษาไทยสำหรับผู้ใช้) เป็น 400 */
function guard<T>(fn: () => T): T {
    try {
        return fn();
    } catch (e) {
        if (e instanceof DepartmentError) throw BadRequest(e.message);
        throw e;
    }
}

export const permissionRepo = {
    async getSettings(): Promise<PermissionSettings> {
        const doc = await getDb().collection(COLLECTION).doc(DOC_ID).get();
        if (!doc.exists) return { departments: {} };
        const data = doc.data() as Partial<PermissionSettings>;
        return { departments: data.departments ?? {} };
    },

    /**
     * แทนที่ทั้งเอกสาร (ไม่ merge) — เดิมใช้ merge:true ทำให้ฝ่ายที่ลบไปแล้วยังค้างอยู่
     */
    async updateSettings(settings: PermissionSettings): Promise<PermissionSettings> {
        const next = { departments: guard(() => cleanDepartmentMap(settings.departments)) };
        await getDb().collection(COLLECTION).doc(DOC_ID).set(next);
        return next;
    },

    /** จำนวนผู้ใช้ (ที่ยังไม่ถูกลบ) ในแต่ละฝ่าย */
    async memberCounts(): Promise<Record<string, number>> {
        const snap = await getDb().collection(ACCOUNTS).where('deletedAt', '==', null).get();
        const counts: Record<string, number> = {};
        for (const d of snap.docs) {
            for (const dep of (d.get('departments') as string[] | undefined) ?? []) counts[dep] = (counts[dep] ?? 0) + 1;
        }
        return counts;
    },

    /** เปลี่ยนชื่อฝ่าย พร้อมย้ายผู้ใช้ทุกคนในฝ่ายนั้นไปชื่อใหม่ (atomic ใน batch เดียว) */
    async renameDepartment(fromRaw: string, toRaw: string) {
        const from = fromRaw.trim();
        const db = getDb();
        const ref = db.collection(COLLECTION).doc(DOC_ID);
        const settings = await this.getSettings();
        if (!(from in settings.departments)) throw NotFound('ไม่พบฝ่ายนี้');
        const to = guard(() => normalizeDepartmentName(toRaw));
        if (from === to) return { departments: settings.departments, moved: 0 };
        const departments = guard(() => renameInMap(settings.departments, from, to));

        const members = await db.collection(ACCOUNTS).where('departments', 'array-contains', from).get();
        const batch = db.batch();
        batch.set(ref, { departments });
        for (const d of members.docs) {
            batch.update(d.ref, { departments: renameInList((d.get('departments') as string[]) ?? [], from, to), updatedAt: FieldValue.serverTimestamp() });
        }
        await batch.commit();
        return { departments, moved: members.size };
    },

    /** ลบฝ่าย และเอาฝ่ายนี้ออกจากผู้ใช้ทุกคน */
    async deleteDepartment(nameRaw: string) {
        const name = nameRaw.trim();
        const db = getDb();
        const ref = db.collection(COLLECTION).doc(DOC_ID);
        const settings = await this.getSettings();
        if (!(name in settings.departments)) throw NotFound('ไม่พบฝ่ายนี้');
        const departments = removeFromMap(settings.departments, name);

        const members = await db.collection(ACCOUNTS).where('departments', 'array-contains', name).get();
        const batch = db.batch();
        batch.set(ref, { departments });
        for (const d of members.docs) {
            batch.update(d.ref, { departments: FieldValue.arrayRemove(name), updatedAt: FieldValue.serverTimestamp() });
        }
        await batch.commit();
        return { departments, removed: members.size };
    },
};
