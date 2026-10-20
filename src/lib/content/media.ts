import 'server-only';
import { col } from '../firebase/firestore';
import { listAllObjects } from '../storage/r2';
import { CONTENT, CONTENT_TYPES, type ContentType } from './types';

/** ไฟล์ที่ระบบนี้อัปโหลดเอง (uuid.webp / uuid.jpg) — ไม่แตะไฟล์อื่นที่อาจอยู่ใน bucket เดียวกัน */
export const OWN_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpe?g|png)$/i;

export type Usage =
    | { kind: 'content'; type: ContentType; id: string; title: string; href: string }
    | { kind: 'revision'; type: ContentType; id: string; title: string }
    | { kind: 'trash'; type: ContentType; id: string; title: string }
    | { kind: 'settings'; id: string };

/** ไล่หา URL รูปในข้อมูลทุกชั้น (รองรับเนื้อหาบทความที่ฝังรูปในบล็อก) */
function scanKeys(value: unknown, domain: string, out: Set<string>) {
    if (typeof value === 'string') {
        if (domain && value.startsWith(domain)) {
            const key = value.split('?')[0].split('/').pop();
            if (key) out.add(key);
        }
        return;
    }
    if (Array.isArray(value)) value.forEach((v) => scanKeys(v, domain, out));
    else if (value && typeof value === 'object' && !('toDate' in value)) Object.values(value).forEach((v) => scanKeys(v, domain, out));
}

const domain = () => (process.env.R2_PUBLIC_DOMAIN ?? '').replace(/\/$/, '');

/**
 * แผนที่ key รูป → รายการที่ใช้รูปนั้น ครอบคลุม เนื้อหาทุกประเภท, ตั้งค่า, ประวัติการแก้ไข และถังขยะ
 */
export async function collectUsage(): Promise<Map<string, Usage[]>> {
    const d = domain();
    const map = new Map<string, Usage[]>();
    const add = (keys: Set<string>, u: Usage) => keys.forEach((k) => map.set(k, [...(map.get(k) ?? []), u]));

    const [contents, settings, revisions, trash] = await Promise.all([
        Promise.all(CONTENT_TYPES.map(async (t) => ({ t, snap: await col(CONTENT[t].collection).get() }))),
        col('settings').get(),
        col('revisions').select('type', 'docId', 'title', 'before').get(),
        col('trash').select('type', 'docId', 'title', 'data').get(),
    ]);

    for (const { t, snap } of contents) {
        for (const doc of snap.docs) {
            const keys = new Set<string>();
            scanKeys(doc.data(), d, keys);
            const data = doc.data();
            add(keys, { kind: 'content', type: t, id: doc.id, title: CONTENT[t].title(data), href: CONTENT[t].editHref(doc.id, data) });
        }
    }
    for (const doc of settings.docs) {
        const keys = new Set<string>();
        scanKeys(doc.data(), d, keys);
        add(keys, { kind: 'settings', id: doc.id });
    }
    for (const doc of revisions.docs) {
        const keys = new Set<string>();
        scanKeys(doc.get('before'), d, keys);
        add(keys, { kind: 'revision', type: doc.get('type'), id: doc.get('docId'), title: doc.get('title') });
    }
    for (const doc of trash.docs) {
        const keys = new Set<string>();
        scanKeys(doc.get('data'), d, keys);
        add(keys, { kind: 'trash', type: doc.get('type'), id: doc.id, title: doc.get('title') });
    }
    return map;
}

export type StoredObject = { key: string; url: string; size: number; uploadedAt: string };

/** รายการไฟล์ของระบบนี้บน R2 (ไล่ทุกหน้า สูงสุด 20,000 ไฟล์) */
export async function listOwnObjects(): Promise<StoredObject[]> {
    const d = domain();
    return (await listAllObjects()).filter((o) => OWN_KEY.test(o.key)).map((o) => ({ ...o, url: `${d}/${o.key}` }));
}
