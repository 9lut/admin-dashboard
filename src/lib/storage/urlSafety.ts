/** ตัวช่วยตรวจลิงก์ภายนอกแบบบริสุทธิ์ (ทดสอบได้) — ใช้ใน remote.ts */
import { isIP } from 'node:net';

/** IP ภายใน/สงวน — ห้ามให้ server ไปดึง (กัน SSRF เข้าเครือข่ายภายใน/metadata ของ cloud) */
export function isPrivateIp(ip: string): boolean {
    if (isIP(ip) === 4) {
        const [a, b] = ip.split('.').map(Number);
        return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
    }
    const v = ip.toLowerCase();
    if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7));
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
}

/** หา og:image / twitter:image จาก HTML (ลิงก์โพสต์/บทความที่ไม่ใช่รูปตรง ๆ) */
export function findPreviewImage(html: string, base: string): string | null {
    const metas = html.match(/<meta\b[^>]*>/gi) ?? [];
    for (const want of ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src']) {
        for (const m of metas) {
            const key = m.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
            const content = m.match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
            if (key === want && content) {
                try {
                    return new URL(content.replace(/&amp;/g, '&'), base).toString();
                } catch {
                    /* ข้าม */
                }
            }
        }
    }
    return null;
}

