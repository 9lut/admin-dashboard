/** กราฟเส้นเล็ก (SVG ล้วน ไม่ต้องโหลด recharts) สำหรับแถวในตาราง/การ์ด */
export function Sparkline({ data, color = "#1468c2", width = 96, height = 28 }: { data: number[]; color?: string; width?: number; height?: number }) {
    if (!data.length) return null;
    const max = Math.max(...data, 1);
    const step = data.length > 1 ? width / (data.length - 1) : width;
    const pts = data.map((v, i) => [i * step, height - 2 - (v / max) * (height - 4)] as const);
    const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    const area = `${line} L${width} ${height} L0 ${height} Z`;
    const id = `sp${color.replace(/[^a-z0-9]/gi, "")}`;
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="overflow-visible">
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={color} stopOpacity=".3" />
                    <stop offset="1" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#${id})`} />
            <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
}
