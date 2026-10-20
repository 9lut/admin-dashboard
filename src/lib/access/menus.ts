/**
 * แหล่งข้อมูลเดียวของ "สิทธิ์เข้าถึงเมนู" — ใช้ร่วมกันทั้งฝั่ง UI (เมนู/หน้าจัดการสิทธิ์/ตัวกันหน้า)
 * และฝั่ง API (requireMenuPermission) เพื่อให้สองฝั่งตรงกันเสมอ
 *
 * กติกา:
 * - superadmin เข้าได้ทุกเมนู
 * - admin / user เข้าได้เฉพาะเมนูที่ "ฝ่าย" ที่ตนสังกัดได้รับสิทธิ์ (หลายฝ่าย = รวมสิทธิ์)
 * - เมนูจัดการผู้ใช้ / สิทธิ์ / บันทึกระบบ เป็นของ superadmin เท่านั้น (มอบผ่านฝ่ายไม่ได้)
 */

export type Role = "superadmin" | "admin" | "user";

export type MenuDef = {
    /** href ของเมนู = id ที่เก็บใน settings/permissions */
    id: string;
    label: string;
    group: string;
    description: string;
};

/** เมนูที่มอบให้ฝ่ายได้ (เรียงตามกลุ่มในแถบเมนู) */
export const ASSIGNABLE_MENUS: MenuDef[] = [
    { id: "/admin", label: "แดชบอร์ด", group: "ภาพรวม", description: "สถิติและภาพรวมของเว็บไซต์" },
    { id: "/admin/stats", label: "สถิติเนื้อหา", group: "ภาพรวม", description: "ยอดเข้าชมรายข่าว/กิจกรรม/บทความ" },
    { id: "/admin/news", label: "ข่าวสาร", group: "เนื้อหาเว็บไซต์", description: "เพิ่ม แก้ไข ลบ ข่าวประชาสัมพันธ์" },
    { id: "/admin/activity", label: "รายการกิจกรรม", group: "เนื้อหาเว็บไซต์", description: "เพิ่ม แก้ไข ลบ กิจกรรม" },
    { id: "/admin/activity/calendar", label: "ปฏิทินกิจกรรม", group: "เนื้อหาเว็บไซต์", description: "ดูกิจกรรมแบบปฏิทิน" },
    { id: "/admin/blog/content", label: "บทความ", group: "เนื้อหาเว็บไซต์", description: "เขียนและจัดการบทความ" },
    { id: "/admin/prayer-rooms", label: "ห้องละหมาด", group: "เนื้อหาเว็บไซต์", description: "ข้อมูลห้องละหมาดและแผนที่" },
    { id: "/admin/settings", label: "ติดต่อ & บริจาค", group: "เนื้อหาเว็บไซต์", description: "ข้อมูลติดต่อ โซเชียล บัญชีบริจาค" },
];

/** เมนูเฉพาะ superadmin */
export const SUPERADMIN_MENUS = ["/admin/users", "/admin/permissions", "/admin/log", "/admin/storage"];

/** เมนูที่ทุกคนที่ล็อกอินเข้าได้ */
export const OPEN_MENUS = ["/admin/profile"];

/** เมนูจัดการเนื้อหา — ใครเข้าได้อย่างน้อย 1 เมนู จะได้ "คลังรูป" และ "ถังขยะ" ด้วย (เห็นเฉพาะประเภทของตัวเอง) */
export const CONTENT_MENUS = ["/admin/news", "/admin/activity", "/admin/blog/content", "/admin/prayer-rooms"];
export const CONTENT_TOOL_MENUS = ["/admin/media", "/admin/trash"];

export const ROLE_LABEL: Record<Role, string> = {
    superadmin: "ผู้ดูแลสูงสุด",
    admin: "ผู้ดูแล",
    user: "ผู้ใช้งาน",
};

export const ROLE_HINT: Record<Role, string> = {
    superadmin: "เข้าถึงได้ทุกเมนู รวมถึงจัดการผู้ใช้และสิทธิ์",
    admin: "เข้าถึงเมนูตามฝ่ายที่สังกัด",
    user: "เข้าถึงเมนูตามฝ่ายที่สังกัด",
};

export type DepartmentMap = Record<string, string[]>;

const ASSIGNABLE_IDS = new Set(ASSIGNABLE_MENUS.map((m) => m.id));

/** ตัดค่าที่ไม่รู้จัก/ซ้ำออกจากรายการสิทธิ์ของฝ่าย (กันข้อมูลเก่าที่เคยมอบเมนู superadmin) */
export function cleanMenuIds(ids: string[]): string[] {
    return [...new Set(ids)].filter((id) => ASSIGNABLE_IDS.has(id));
}

/** เมนูทั้งหมดที่ผู้ใช้เข้าได้ */
export function allowedMenus(role: Role | string | undefined, departments: string[] | undefined, map: DepartmentMap): Set<string> {
    if (role === "superadmin") return new Set([...ASSIGNABLE_IDS, ...SUPERADMIN_MENUS, ...OPEN_MENUS, ...CONTENT_TOOL_MENUS]);
    const out = new Set<string>(OPEN_MENUS);
    for (const d of departments ?? []) for (const id of map[d] ?? []) if (ASSIGNABLE_IDS.has(id)) out.add(id);
    if (CONTENT_MENUS.some((m) => out.has(m))) CONTENT_TOOL_MENUS.forEach((m) => out.add(m));
    return out;
}

/** เมนูที่ตรงกับ path (href ยาวสุดที่เป็น prefix) — ใช้กันหน้าย่อย เช่น /admin/news/create → /admin/news */
export function menuForPath(pathname: string): string | null {
    const all = [...ASSIGNABLE_IDS, ...SUPERADMIN_MENUS, ...OPEN_MENUS, ...CONTENT_TOOL_MENUS];
    let best: string | null = null;
    for (const id of all) {
        if ((pathname === id || pathname.startsWith(id + "/")) && (!best || id.length > best.length)) best = id;
    }
    return best;
}

export function canAccessPath(pathname: string, allowed: Set<string>): boolean {
    const menu = menuForPath(pathname);
    return menu === null ? true : allowed.has(menu);
}
