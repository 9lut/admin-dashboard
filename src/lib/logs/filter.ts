/** ตัวกรองบันทึกระบบแบบบริสุทธิ์ (ใช้ใน systemLogRepo.search และทดสอบได้ตรง ๆ) */

export type LogFilter = {
    action?: string;
    userId?: string;
    /** ส่วนของระบบ เช่น "news" (ตรงกับ /api/news...) */
    resource?: string;
    /** คำค้น: ตรวจกับ action/resource/ip/อีเมล และผู้ใช้ที่ชื่อตรง (userIdsMatchingQ) */
    q?: string;
    userIdsMatchingQ?: Set<string>;
};

export type LogDoc = { action?: string; resource?: string; userId?: string; ip?: string; details?: { email?: string } };

/** "/api/news/123" → "news" */
export const resourceKey = (r = ''): string => r.replace(/^\/?(api\/)?/, '').split(/[/?]/)[0] || '';

export function matchesLog(d: LogDoc, o: LogFilter): boolean {
    if (o.action && d.action !== o.action) return false;
    if (o.userId && d.userId !== o.userId) return false;
    if (o.resource && resourceKey(d.resource) !== o.resource) return false;
    if (o.q) {
        const q = o.q.toLowerCase();
        const hay = `${d.action ?? ''} ${d.resource ?? ''} ${d.ip ?? ''} ${d.details?.email ?? ''}`.toLowerCase();
        if (!hay.includes(q) && !(d.userId && o.userIdsMatchingQ?.has(d.userId))) return false;
    }
    return true;
}
