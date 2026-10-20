/** ดึงรายการ URL รูปจากเอกสารแต่ละประเภท (ใช้ตอนลบหลายรายการ) — โมดูลบริสุทธิ์ */

/** รูปจากฟิลด์ images (array ของ string) */
export const imagesField = (d: Record<string, unknown>): string[] =>
    Array.isArray(d.images) ? (d.images as unknown[]).filter((x): x is string => typeof x === 'string' && x.length > 0) : [];

/** รูปของบทความ: ปก + รูปที่อยู่ในบล็อกเนื้อหา */
export const blogImages = (d: Record<string, unknown>): string[] => {
    const out: string[] = [];
    if (typeof d.coverImage === 'string' && d.coverImage) out.push(d.coverImage);
    if (Array.isArray(d.content)) {
        for (const b of d.content as { type?: string; data?: { url?: string } }[]) {
            if (b?.type === 'image' && b.data?.url) out.push(b.data.url);
        }
    }
    return out;
};

/** key ของไฟล์จาก URL สาธารณะ (ชื่อไฟล์ท้าย path ตัด query) */
export const keyFromUrl = (fileUrl: string): string | null => fileUrl.split('?')[0].split('/').pop() || null;

/** ดึงพิกัดจากลิงก์ Google Maps (/@lat,lng · !3dlat!4dlng · ?q=lat,lng) */
export function coordsFromMapsUrl(url: string): [string, string] | null {
    const m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ?? url.match(/3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ?? url.match(/[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    return m ? [m[1], m[2]] : null;
}
