/** ตัวช่วยจัดรูปแบบวันที่/ตัวเลขภาษาไทย ใช้ร่วมกันทุกหน้า */

export const TH_MONTHS = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

export const MONTH_OPTIONS = TH_MONTHS.map((label, i) => ({ value: String(i + 1).padStart(2, "0"), label }));

export function toTime(v?: string | Date | null): number {
    if (!v) return 0;
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? 0 : t;
}

/** ปีที่มีข้อมูลจริง (พ.ศ. ในป้าย, ค.ศ. ในค่า) เรียงใหม่→เก่า */
export function yearOptions(dates: (string | Date | null | undefined)[]) {
    const ys = new Set<number>();
    for (const d of dates) {
        const t = toTime(d);
        if (t) ys.add(new Date(t).getFullYear());
    }
    return [...ys].sort((a, b) => b - a).map((y) => ({ value: String(y), label: `พ.ศ. ${y + 543}` }));
}

export function matchMonthYear(v: string | Date | null | undefined, month: string, year: string) {
    if (!month && !year) return true;
    const t = toTime(v);
    if (!t) return false;
    const d = new Date(t);
    if (year && String(d.getFullYear()) !== year) return false;
    if (month && String(d.getMonth() + 1).padStart(2, "0") !== month) return false;
    return true;
}

export const fmtDate = (v?: string | Date | null, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
    toTime(v) ? new Date(v as string).toLocaleDateString("th-TH", opts) : "—";

export const fmtDateTime = (v?: string | Date | null) =>
    toTime(v) ? new Date(v as string).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

/** ข้อความค้นหาแบบไม่สนตัวพิมพ์ใหญ่เล็ก/ช่องว่างซ้ำ */
export const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
export const includesAll = (hay: unknown[], q: string) => {
    const h = norm(hay.join(" "));
    return norm(q).split(" ").every((w) => h.includes(w));
};

/** วันที่แบบสั้นสำหรับการ์ด (ปี 2 หลัก) เช่น 25 ต.ค. 69 */
export const fmtShort = (v?: string | Date | null) => fmtDate(v, { day: "numeric", month: "short", year: "2-digit" });
