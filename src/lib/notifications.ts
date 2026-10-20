/**
 * การแจ้งเตือนในหลังบ้าน — คำนวณสดจากข้อมูลจริง (ไม่ต้องเก็บคอลเลกชันแยก)
 * ส่วนนี้เป็นฟังก์ชันบริสุทธิ์ ทดสอบได้โดยไม่ต้องต่อฐานข้อมูล
 */

export type NotificationItem = {
    id: string;
    kind: "activity-soon" | "activity-today" | "news-review" | "user-no-dept" | "user-must-change";
    title: string;
    body: string;
    href: string;
    at: string;
    tone: "primary" | "amber" | "green";
    art: string;
};

const DAY = 86400000;

type ActivityLite = { _id: string; name_th: string; start_date?: string | null; end_date?: string | null; location?: string };
type NewsLite = { _id: string; name: string; createdAt?: string; source?: string };
type UserLite = { _id: string; firstName?: string; lastName?: string; role?: string; departments?: string[]; mustChangePassword?: boolean };

const startOfDay = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
};

/** กิจกรรมที่กำลังจัดวันนี้ และที่จะเริ่มภายใน withinDays วัน */
export function activityNotifications(list: ActivityLite[], now: number, withinDays = 7): NotificationItem[] {
    const today = startOfDay(now);
    const out: NotificationItem[] = [];
    for (const a of list) {
        const s = a.start_date ? new Date(a.start_date).getTime() : NaN;
        if (Number.isNaN(s)) continue;
        const e = a.end_date ? new Date(a.end_date).getTime() : s;
        const startDay = startOfDay(s);
        const endDay = startOfDay(Number.isNaN(e) ? s : e);
        if (startDay <= today && today <= endDay) {
            out.push({
                id: `activity-today:${a._id}`,
                kind: "activity-today",
                title: `วันนี้มีกิจกรรม “${a.name_th}”`,
                body: a.location ? `สถานที่: ${a.location}` : "ตรวจสอบรายละเอียดก่อนเริ่มงาน",
                href: `/admin/activity/edit/${a._id}`,
                at: new Date(s).toISOString(),
                tone: "green",
                art: "activities",
            });
            continue;
        }
        const days = Math.round((startDay - today) / DAY);
        if (days >= 1 && days <= withinDays) {
            out.push({
                id: `activity-soon:${a._id}`,
                kind: "activity-soon",
                title: `“${a.name_th}” จะจัด${days === 1 ? "พรุ่งนี้" : `ในอีก ${days} วัน`}`,
                body: "ตรวจรูป รายละเอียด และประชาสัมพันธ์ให้พร้อม",
                href: `/admin/activity/edit/${a._id}`,
                at: new Date(s).toISOString(),
                tone: "primary",
                art: "calendar",
            });
        }
    }
    // วันนี้ก่อน แล้วเรียงตามวันที่ใกล้สุด
    return out.sort((x, y) => (x.kind === y.kind ? x.at.localeCompare(y.at) : x.kind === "activity-today" ? -1 : 1));
}

export function newsReviewNotifications(list: NewsLite[]): NotificationItem[] {
    return list.map((n) => ({
        id: `news-review:${n._id}`,
        kind: "news-review",
        title: "ข่าวจาก Facebook รอตรวจ",
        body: n.name,
        href: `/admin/news/edit/${n._id}`,
        at: n.createdAt ?? new Date(0).toISOString(),
        tone: "amber",
        art: "news",
    }));
}

/** สรุปเรื่องผู้ใช้ที่ต้องจัดการ (เฉพาะ superadmin) — รวมเป็นรายการเดียวต่อหัวข้อ */
export function userNotifications(users: UserLite[], now: number): NotificationItem[] {
    const out: NotificationItem[] = [];
    const noDept = users.filter((u) => u.role !== "superadmin" && !(u.departments ?? []).length);
    if (noDept.length) {
        out.push({
            id: `user-no-dept:${noDept.map((u) => u._id).sort().join(",")}`,
            kind: "user-no-dept",
            title: `ผู้ใช้ ${noDept.length} คนยังไม่มีฝ่าย`,
            body: "ผู้ใช้เหล่านี้จะยังไม่เห็นเมนูใดเลย — กำหนดฝ่ายให้ก่อน",
            href: "/admin/users",
            at: new Date(now).toISOString(),
            tone: "amber",
            art: "users",
        });
    }
    const mustChange = users.filter((u) => u.mustChangePassword);
    if (mustChange.length) {
        out.push({
            id: `user-must-change:${mustChange.map((u) => u._id).sort().join(",")}`,
            kind: "user-must-change",
            title: `ผู้ใช้ ${mustChange.length} คนยังไม่ได้เปลี่ยนรหัสผ่านเริ่มต้น`,
            body: mustChange.slice(0, 3).map((u) => `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()).join(", "),
            href: "/admin/users",
            at: new Date(now).toISOString(),
            tone: "primary",
            art: "security",
        });
    }
    return out;
}
