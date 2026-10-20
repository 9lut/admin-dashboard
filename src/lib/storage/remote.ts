import 'server-only';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { BadRequest } from '../http/response';
import { findPreviewImage, isPrivateIp } from './urlSafety';

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 12_000;

async function assertPublicUrl(raw: string): Promise<URL> {
    let u: URL;
    try {
        u = new URL(raw);
    } catch {
        throw BadRequest('ลิงก์ไม่ถูกต้อง');
    }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw BadRequest('รองรับเฉพาะลิงก์ http/https');
    if (u.username || u.password) throw BadRequest('ลิงก์ไม่ถูกต้อง');
    const host = u.hostname.replace(/^\[|\]$/g, '');
    const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
    if (!addrs.length) throw BadRequest('ไม่พบเว็บไซต์ของลิงก์นี้');
    if (addrs.some((a) => isPrivateIp(a.address))) throw BadRequest('ไม่อนุญาตลิงก์ไปยังเครือข่ายภายใน');
    return u;
}

/** fetch แบบตามลิงก์ redirect เอง (ตรวจปลายทางทุกครั้ง) */
async function safeFetch(raw: string): Promise<Response> {
    let url = raw;
    for (let i = 0; i <= MAX_REDIRECTS; i++) {
        const u = await assertPublicUrl(url);
        const res = await fetch(u, {
            redirect: 'manual',
            signal: AbortSignal.timeout(TIMEOUT_MS),
            headers: { 'user-agent': 'Mozilla/5.0 (compatible; MSS-Admin/1.0)', accept: 'image/*,text/html;q=0.8' },
        });
        if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
            url = new URL(res.headers.get('location')!, u).toString();
            continue;
        }
        if (!res.ok) throw BadRequest(`ดึงข้อมูลจากลิงก์ไม่สำเร็จ (HTTP ${res.status})`);
        return res;
    }
    throw BadRequest('ลิงก์เปลี่ยนเส้นทางหลายครั้งเกินไป');
}

async function readLimited(res: Response, limit: number): Promise<Buffer> {
    const len = Number(res.headers.get('content-length') ?? 0);
    if (len > limit) throw BadRequest('ไฟล์ใหญ่เกิน 10MB');
    const reader = res.body?.getReader();
    if (!reader) return Buffer.alloc(0);
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > limit) {
            await reader.cancel();
            throw BadRequest('ไฟล์ใหญ่เกิน 10MB');
        }
        chunks.push(value);
    }
    return Buffer.concat(chunks);
}

/**
 * ดึงรูปจากลิงก์: ลิงก์รูปตรง ๆ หรือลิงก์หน้าเว็บที่มี og:image
 * คืน buffer ของรูป (ไปอัปโหลดเก็บใน R2 ต่อ — กันลิงก์ต้นทางหมดอายุ เช่นรูปจาก Facebook)
 */
export async function fetchRemoteImage(url: string): Promise<Buffer> {
    let res = await safeFetch(url);
    let type = (res.headers.get('content-type') ?? '').toLowerCase();
    if (type.includes('text/html')) {
        const html = (await readLimited(res, 2 * 1024 * 1024)).toString('utf8');
        const img = findPreviewImage(html, res.url || url);
        if (!img) throw BadRequest('ไม่พบรูปในลิงก์นี้ — ลองคลิกขวาที่รูปแล้วเลือก "คัดลอกที่อยู่รูปภาพ" แทน');
        res = await safeFetch(img);
        type = (res.headers.get('content-type') ?? '').toLowerCase();
    }
    if (!/^image\/(jpeg|jpg|png|webp|gif)/.test(type)) throw BadRequest('ลิงก์นี้ไม่ใช่ไฟล์รูป (รองรับ JPG, PNG, WEBP, GIF)');
    const buf = await readLimited(res, MAX_BYTES);
    if (!buf.length) throw BadRequest('ไฟล์รูปว่างเปล่า');
    return buf;
}
