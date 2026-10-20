"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** สีประจำประเภทเนื้อหา (ใช้ทั้งระบบให้ตรงกัน) */
export const TYPE_COLOR: Record<string, string> = {
    news: "#1468c2",
    activities: "#0299d1",
    blog: "#e3a52f",
    "prayer-rooms": "#14b8a6",
};
export const TYPE_LABEL: Record<string, string> = { news: "ข่าวสาร", activities: "กิจกรรม", blog: "บทความ", "prayer-rooms": "ห้องละหมาด" };

const tooltip = {
    contentStyle: { borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)", boxShadow: "0 12px 30px rgb(0 0 0 / 0.12)", fontSize: 12 },
    labelStyle: { color: "var(--muted)", marginBottom: 4 },
    itemStyle: { color: "var(--text)", fontWeight: 700 },
};
const dayLabel = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" });

/** กราฟพื้นที่ซ้อนกัน: ยอดเข้าชมรายวันแยกประเภท */
export function StackedViewsChart({ days, byType, height = 300 }: { days: string[]; byType: Record<string, number[]>; height?: number }) {
    const types = Object.keys(byType);
    const data = days.map((d, i) => ({ day: d, ...Object.fromEntries(types.map((t) => [t, byType[t][i] ?? 0])) }));
    return (
        <div style={{ height }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                        {types.map((t) => (
                            <linearGradient key={t} id={`g-${t}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={TYPE_COLOR[t] ?? "#1468c2"} stopOpacity={0.45} />
                                <stop offset="100%" stopColor={TYPE_COLOR[t] ?? "#1468c2"} stopOpacity={0.02} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="day" tickFormatter={dayLabel} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
                    <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltip} labelFormatter={(d) => dayLabel(String(d))} formatter={(v, n) => [Number(v).toLocaleString(), TYPE_LABEL[String(n)] ?? n]} />
                    <Legend iconType="circle" formatter={(v) => <span className="text-xs text-fg-2">{TYPE_LABEL[v] ?? v}</span>} />
                    {types.map((t) => (
                        <Area key={t} type="monotone" dataKey={t} stackId="1" stroke={TYPE_COLOR[t] ?? "#1468c2"} strokeWidth={2} fill={`url(#g-${t})`} />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

/** กราฟเส้นของเนื้อหาชิ้นเดียว */
export function ItemLineChart({ days, series, color = "#1468c2", height = 240 }: { days: string[]; series: number[]; color?: string; height?: number }) {
    const data = days.map((d, i) => ({ day: d, views: series[i] ?? 0 }));
    return (
        <div style={{ height }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="day" tickFormatter={dayLabel} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
                    <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltip} labelFormatter={(d) => dayLabel(String(d))} formatter={(v) => [Number(v).toLocaleString(), "ยอดเข้าชม"]} />
                    <Line type="monotone" dataKey="views" stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

/** แท่งแนวนอน: อันดับ */
export function RankBarChart({ rows, height = 300 }: { rows: { label: string; value: number; color?: string }[]; height?: number }) {
    return (
        <div style={{ height }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis type="category" dataKey="label" width={130} tick={{ fill: "var(--text-2)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: string) => (v.length > 18 ? v.slice(0, 17) + "…" : v)} />
                    <Tooltip {...tooltip} cursor={{ fill: "var(--surface-2)" }} formatter={(v) => [Number(v).toLocaleString(), "ยอดเข้าชม"]} />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={16}>
                        {rows.map((r, i) => <Cell key={i} fill={r.color ?? "#1468c2"} />)}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

/** โดนัทสัดส่วน */
export function DonutChart({ rows, height = 220, centerLabel, centerValue }: { rows: { label: string; value: number; color: string }[]; height?: number; centerLabel?: string; centerValue?: string }) {
    const data = rows.filter((r) => r.value > 0);
    return (
        <div style={{ height }} className="relative w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Tooltip {...tooltip} formatter={(v, n) => [Number(v).toLocaleString(), n]} />
                    <Pie data={data.length ? data : [{ label: "ไม่มีข้อมูล", value: 1, color: "var(--border)" }]} dataKey="value" nameKey="label" innerRadius="64%" outerRadius="92%" paddingAngle={data.length > 1 ? 3 : 0} stroke="none">
                        {(data.length ? data : [{ color: "var(--border)" }]).map((r, i) => <Cell key={i} fill={r.color} />)}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            {centerValue && (
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                    <div>
                        <p className="tabular font-display text-2xl font-bold text-fg">{centerValue}</p>
                        {centerLabel && <p className="text-[11px] text-muted">{centerLabel}</p>}
                    </div>
                </div>
            )}
        </div>
    );
}
