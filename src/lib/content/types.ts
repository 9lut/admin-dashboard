/**
 * ทะเบียนประเภทเนื้อหา — ใช้ร่วมกันโดยถังขยะ ประวัติการแก้ไข คลังรูป และสถิติ
 * โมดูลบริสุทธิ์ (ห้าม import ผ่าน "@/") เพื่อให้ทดสอบด้วย node --test ได้
 */
import { blogImages, imagesField } from '../inputs/images.ts';

export type ContentType = 'news' | 'activities' | 'prayer-rooms' | 'blog';

export type ContentDef = {
    type: ContentType;
    /** ชื่อคอลเลกชันใน Firestore */
    collection: string;
    /** เมนูที่ต้องมีสิทธิ์ (lib/access/menus.ts) */
    menu: string;
    label: string;
    art: string;
    title: (d: Record<string, unknown>) => string;
    images: (d: Record<string, unknown>) => string[];
    editHref: (id: string, d: Record<string, unknown>) => string;
    /** ประเภทที่รองรับร่าง/ตั้งเวลาเผยแพร่ */
    publishable: boolean;
};

const str = (v: unknown) => (typeof v === 'string' ? v : '');

export const CONTENT: Record<ContentType, ContentDef> = {
    news: {
        type: 'news',
        collection: 'news',
        menu: '/admin/news',
        label: 'ข่าวสาร',
        art: 'news',
        title: (d) => str(d.name) || 'ข่าวไม่มีชื่อ',
        images: imagesField,
        editHref: (id) => `/admin/news/edit/${id}`,
        publishable: true,
    },
    activities: {
        type: 'activities',
        collection: 'activities',
        menu: '/admin/activity',
        label: 'กิจกรรม',
        art: 'activities',
        title: (d) => str(d.name_th) || str(d.name_eng) || 'กิจกรรมไม่มีชื่อ',
        images: imagesField,
        editHref: (id) => `/admin/activity/edit/${id}`,
        publishable: true,
    },
    'prayer-rooms': {
        type: 'prayer-rooms',
        collection: 'prayerRooms',
        menu: '/admin/prayer-rooms',
        label: 'ห้องละหมาด',
        art: 'prayer-room',
        title: (d) => str(d.name_th) || str(d.name) || 'ห้องละหมาดไม่มีชื่อ',
        images: imagesField,
        editHref: (id) => `/admin/prayer-rooms/edit/${id}`,
        publishable: false,
    },
    blog: {
        type: 'blog',
        collection: 'blogs',
        menu: '/admin/blog/content',
        label: 'บทความ',
        art: 'blog',
        title: (d) => str(d.title) || 'บทความไม่มีชื่อ',
        images: blogImages,
        editHref: (id, d) => `/admin/blog/content/edit/${str(d.slug) || id}`,
        publishable: false,
    },
};

export const CONTENT_TYPES = Object.keys(CONTENT) as ContentType[];
export const isContentType = (v: unknown): v is ContentType => typeof v === 'string' && v in CONTENT;

/** ฟิลด์ที่ไม่นับเป็น "การแก้ไขเนื้อหา" ตอนเทียบเวอร์ชัน */
const IGNORED = new Set(['updatedAt', 'createdAt', 'views', 'reviewedAt', 'legacySlugs']);

const norm = (v: unknown): string => {
    if (v && typeof v === 'object' && 'toDate' in (v as object)) return String((v as { toDate: () => Date }).toDate().getTime());
    if (v instanceof Date) return String(v.getTime());
    return JSON.stringify(v ?? null);
};

/** ฟิลด์ที่เปลี่ยนระหว่างสองเวอร์ชัน (เทียบแบบตื้น รองรับ Timestamp) */
export function changedFields(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    return [...keys].filter((k) => !IGNORED.has(k) && norm(before[k]) !== norm(after[k])).sort();
}

/** ชื่อฟิลด์ภาษาไทยสำหรับแสดงในประวัติ */
export const FIELD_LABEL: Record<string, string> = {
    name: 'ชื่อ', name_th: 'ชื่อ (ไทย)', name_eng: 'ชื่อ (อังกฤษ)', name_en: 'ชื่อ (อังกฤษ)', title: 'หัวข้อ',
    description: 'รายละเอียด', detail: 'รายละเอียด', content: 'เนื้อหา', images: 'รูปภาพ', coverImage: 'รูปปก',
    date: 'วันที่', start_date: 'วันเริ่ม', end_date: 'วันสิ้นสุด', location: 'สถานที่/พิกัด', place: 'สถานที่',
    link: 'ลิงก์', status: 'สถานะเผยแพร่', publishAt: 'เวลาเผยแพร่', favorite: 'กิจกรรมแนะนำ', objectives: 'วัตถุประสงค์',
    goals: 'เป้าหมาย', participants: 'ผู้เข้าร่วม', duration: 'ระยะเวลา', slug: 'ลิงก์ (slug)', tags: 'แท็ก', group: 'กลุ่ม',
    faculty: 'คณะ', capacity: 'ความจุ', openingHours: 'เวลาเปิด', facilities: 'สิ่งอำนวยความสะดวก', phone: 'เบอร์โทร',
    youtube_url: 'YouTube', google_map_url: 'Google Maps',
};
