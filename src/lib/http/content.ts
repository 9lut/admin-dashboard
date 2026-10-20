import 'server-only';
import { BadRequest } from './response';
import { requireMenuPermission, type AuthUser } from '../auth/guard';
import { parsePublishInput, PublishInputError } from '../content/publish';
import { OWN_KEY } from '../content/media';

/** ?admin=1 = เรียกจากหลังบ้าน: ต้องมีสิทธิ์เมนู · เห็นร่าง/ตั้งเวลา · ไม่นับยอดวิว */
export async function adminMode(req: Request, menu: string): Promise<AuthUser | null> {
    if (new URL(req.url).searchParams.get('admin') !== '1') return null;
    return requireMenuPermission(menu);
}

/** สถานะเผยแพร่จากฟอร์ม (publish_state + publish_at) */
export function readPublish(get: (k: string) => string | undefined) {
    try {
        return parsePublishInput(get('publish_state'), get('publish_at'), Date.now());
    } catch (e) {
        if (e instanceof PublishInputError) throw BadRequest(e.message);
        throw e;
    }
}

/**
 * URL รูปที่เลือกจาก "คลังรูป" (JSON array) — รับเฉพาะไฟล์ของระบบนี้บน R2 เท่านั้น
 * กันการแอบใส่ URL ภายนอกลงในเนื้อหา
 */
export function readImageUrls(raw: string | undefined): string[] {
    if (!raw) return [];
    let list: unknown;
    try {
        list = JSON.parse(raw);
    } catch {
        throw BadRequest('image_urls ต้องเป็น JSON array');
    }
    if (!Array.isArray(list)) throw BadRequest('image_urls ต้องเป็น JSON array');
    const domain = (process.env.R2_PUBLIC_DOMAIN ?? '').replace(/\/$/, '');
    return [...new Set(list.map(String))].filter((u) => {
        const key = u.split('/').pop() ?? '';
        return !!domain && u === `${domain}/${key}` && OWN_KEY.test(key);
    }).slice(0, 20);
}
