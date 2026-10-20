/**
 * รวมสถิติการเข้าชม — โมดูลบริสุทธิ์ (ทดสอบได้) ใช้กับข้อมูลรายวันจาก viewStats
 */
import type { ContentType } from './types.ts';

export type DailyViews = Record<string, Record<string, number>>; // day → { "type:id": n }

export type ItemMeta = { type: ContentType; id: string; title: string; totalViews: number; createdAt: string | null; href: string; state: string };

export type ItemStats = ItemMeta & { rangeViews: number; series: number[]; prevViews: number };

/**
 * days: วันเรียงเก่า→ใหม่ (ครึ่งแรก = ช่วงก่อนหน้า, ครึ่งหลัง = ช่วงปัจจุบัน ถ้า compare=true)
 */
export function aggregate(days: string[], daily: DailyViews, items: ItemMeta[], compare = false) {
    const cur = compare ? days.slice(Math.floor(days.length / 2)) : days;
    const prev = compare ? days.slice(0, Math.floor(days.length / 2)) : [];

    const byType: Record<string, number[]> = {};
    const total = cur.map(() => 0);
    const stats: ItemStats[] = items.map((m) => {
        const key = `${m.type}:${m.id}`;
        const series = cur.map((d) => daily[d]?.[key] ?? 0);
        const prevViews = prev.reduce((s, d) => s + (daily[d]?.[key] ?? 0), 0);
        return { ...m, series, rangeViews: series.reduce((a, b) => a + b, 0), prevViews };
    });

    // ยอดรายวันแยกประเภท (รวมเนื้อหาที่ถูกลบแล้วด้วย เพราะยอดเกิดขึ้นจริง)
    cur.forEach((d, i) => {
        for (const [key, n] of Object.entries(daily[d] ?? {})) {
            const type = key.split(':')[0];
            (byType[type] ??= cur.map(() => 0))[i] += n;
            total[i] += n;
        }
    });
    const prevTotal = prev.reduce((s, d) => s + Object.values(daily[d] ?? {}).reduce((a, b) => a + b, 0), 0);
    const rangeTotal = total.reduce((a, b) => a + b, 0);

    return {
        days: cur,
        total,
        byType,
        rangeTotal,
        prevTotal,
        change: prevTotal ? Math.round(((rangeTotal - prevTotal) / prevTotal) * 1000) / 10 : null,
        items: stats.sort((a, b) => b.rangeViews - a.rangeViews || b.totalViews - a.totalViews),
    };
}
