"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ExternalLink, Eye } from "lucide-react";
import { Change } from "@/app/components/chart/Change";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { ListToolbar, ToolbarSelect } from "@/app/components/ui/ListToolbar";
import { Pagination } from "@/app/components/ui/Pagination";
import { Badge, EmptyState, Modal, Section, Segmented } from "@/app/components/ui/kit";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Sparkline } from "@/app/components/chart/Sparkline";
import { fetchContentStats, type ContentStatItem, type ContentStats } from "@/lib/api/stats";
import { includesAll } from "@/lib/format";
import { handleApiError } from "@/lib/axios";
import { cn } from "@/lib/utils";

const chartSkeleton = () => <Skeleton className="h-[300px] w-full rounded-2xl" />;
const StackedViewsChart = dynamic(() => import("@/app/components/chart/ViewsCharts").then((m) => m.StackedViewsChart), { ssr: false, loading: chartSkeleton });
const ItemLineChart = dynamic(() => import("@/app/components/chart/ViewsCharts").then((m) => m.ItemLineChart), { ssr: false, loading: chartSkeleton });
const DonutChart = dynamic(() => import("@/app/components/chart/ViewsCharts").then((m) => m.DonutChart), { ssr: false, loading: chartSkeleton });

const TYPE: Record<string, { label: string; color: string }> = {
    news: { label: "ข่าวสาร", color: "#1468c2" },
    activities: { label: "กิจกรรม", color: "#0299d1" },
    blog: { label: "บทความ", color: "#e3a52f" },
    "prayer-rooms": { label: "ห้องละหมาด", color: "#14b8a6" },
};
const RANGES = [
    { id: "7", label: "7 วัน" },
    { id: "30", label: "30 วัน" },
    { id: "90", label: "90 วัน" },
    { id: "365", label: "1 ปี" },
];
const SORTS = [
    { value: "range", label: "ยอดในช่วงนี้มากสุด" },
    { value: "total", label: "ยอดสะสมมากสุด" },
    { value: "growth", label: "เติบโตมากสุด" },
    { value: "new", label: "เพิ่มล่าสุด" },
];

const pct = (cur: number, prev: number) => (prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : null);

export default function StatsPage() {
    const [days, setDays] = useState("30");
    const [data, setData] = useState<ContentStats | null>(null);
    const [error, setError] = useState("");
    const [type, setType] = useState("");
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("range");
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);
    const [detail, setDetail] = useState<ContentStatItem | null>(null);

    const load = useCallback(async (d: string) => {
        setData(null);
        setError("");
        try {
            setData(await fetchContentStats(Number(d)));
        } catch (e) {
            setError(handleApiError(e));
        }
    }, []);
    useEffect(() => {
        void load(days);
    }, [days, load]);
    useEffect(() => setPage(1), [type, search, sort, perPage, days]);

    const typeTotals = useMemo(
        () =>
            Object.keys(TYPE).map((t) => {
                const cur = (data?.byType[t] ?? []).reduce((a, b) => a + b, 0);
                const prev = (data?.items ?? []).filter((i) => i.type === t).reduce((s, i) => s + i.prevViews, 0);
                return { type: t, cur, prev, items: (data?.items ?? []).filter((i) => i.type === t).length };
            }),
        [data],
    );

    const rows = useMemo(() => {
        const list = (data?.items ?? []).filter((i) => (!type || i.type === type) && (!search || includesAll([i.title], search)));
        const g = (i: ContentStatItem) => (i.prevViews ? (i.rangeViews - i.prevViews) / i.prevViews : i.rangeViews ? 1e9 : 0);
        return [...list].sort((a, b) =>
            sort === "total" ? b.totalViews - a.totalViews : sort === "growth" ? g(b) - g(a) : sort === "new" ? String(b.createdAt).localeCompare(String(a.createdAt)) : b.rangeViews - a.rangeViews,
        );
    }, [data, type, search, sort]);
    const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
    const shown = rows.slice((page - 1) * perPage, page * perPage);
    const zeroViews = (data?.items ?? []).filter((i) => i.rangeViews === 0 && i.state === "published").length;

    return (
        <div className="w-full space-y-6">
            <PageHeader title="สถิติเนื้อหา" description="ยอดเข้าชมรายวันของข่าว กิจกรรม บทความ และห้องละหมาด" art="analytics">
                <Segmented label="ช่วงเวลา" value={days} onChange={setDays} options={RANGES} />
            </PageHeader>

            {error && (
                <Section>
                    <EmptyState art="analytics" title="โหลดสถิติไม่สำเร็จ" description={error} action={<button type="button" className="btn-primary" onClick={() => load(days)}>ลองใหม่</button>} />
                </Section>
            )}

            {/* KPI */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                {!data ? (
                    Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)
                ) : (
                    <>
                        <div className="col-span-2 rounded-2xl bg-gradient-to-br from-sky-600 to-sky-800 p-4 text-white shadow-card lg:col-span-1">
                            <p className="flex items-center gap-1.5 text-xs font-bold text-white/80"><Eye className="size-3.5" /> ยอดเข้าชมรวม</p>
                            <p className="tabular mt-1 font-display text-3xl font-bold">{data.rangeTotal.toLocaleString()}</p>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-white/80">
                                <Change value={data.change} className="bg-white/15 text-white" /> เทียบ {days} วันก่อนหน้า
                            </p>
                        </div>
                        {typeTotals.map((t) => (
                            <button key={t.type} type="button" onClick={() => setType(type === t.type ? "" : t.type)} className={cn("rounded-2xl border bg-surface p-4 text-left shadow-card transition-colors", type === t.type ? "border-primary" : "border-line hover:border-primary/40")}>
                                <p className="flex items-center gap-1.5 text-xs font-bold text-fg-2">
                                    <span className="size-2.5 rounded-full" style={{ background: TYPE[t.type].color }} /> {TYPE[t.type].label}
                                </p>
                                <p className="tabular mt-1 font-display text-2xl font-bold text-fg">{t.cur.toLocaleString()}</p>
                                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted"><Change value={pct(t.cur, t.prev)} /> {t.items} รายการ</p>
                            </button>
                        ))}
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Section title="ยอดเข้าชมรายวัน" description="แยกตามประเภทเนื้อหา" className="xl:col-span-2" bodyClassName="p-4 sm:p-5">
                    {data ? <StackedViewsChart days={data.days} byType={data.byType} /> : chartSkeleton()}
                </Section>
                <Section title="สัดส่วนการเข้าชม" bodyClassName="p-4 sm:p-5">
                    {data ? (
                        <>
                            <DonutChart rows={typeTotals.map((t) => ({ label: TYPE[t.type].label, value: t.cur, color: TYPE[t.type].color }))} centerValue={data.rangeTotal.toLocaleString()} centerLabel="ครั้ง" />
                            <ul className="mt-3 space-y-1.5">
                                {typeTotals.map((t) => (
                                    <li key={t.type} className="flex items-center gap-2 text-sm">
                                        <span className="size-2.5 rounded-full" style={{ background: TYPE[t.type].color }} />
                                        <span className="flex-1 text-fg-2">{TYPE[t.type].label}</span>
                                        <span className="tabular font-bold text-fg">{data.rangeTotal ? Math.round((t.cur / data.rangeTotal) * 100) : 0}%</span>
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : (
                        chartSkeleton()
                    )}
                </Section>
            </div>

            {data && zeroViews > 0 && (
                <p className="rounded-2xl bg-warning-soft px-4 py-3 text-sm text-warning">
                    มีเนื้อหาที่เผยแพร่อยู่ <b>{zeroViews}</b> รายการที่ไม่มีคนเข้าชมเลยใน {days} วันนี้ — ลองแชร์ซ้ำหรือปรับหัวข้อ/รูปปก
                </p>
            )}

            <section className="space-y-3">
                <ListToolbar
                    search={search}
                    onSearch={setSearch}
                    placeholder="ค้นหาชื่อเนื้อหา…"
                    activeFilters={type ? 1 : 0}
                    onClear={() => {
                        setType("");
                        setSearch("");
                    }}
                    filters={<ToolbarSelect label="ประเภท" value={type} onChange={setType} allLabel="ทุกประเภท" options={Object.entries(TYPE).map(([value, t]) => ({ value, label: t.label }))} />}
                    sort={{ value: sort, onChange: setSort, options: SORTS }}
                    summary={data && `${rows.length.toLocaleString()} รายการ`}
                />
                {!data ? (
                    <div className="space-y-2">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
                ) : shown.length === 0 ? (
                    <Section><EmptyState art="analytics" title="ไม่พบเนื้อหา" /></Section>
                ) : (
                    <Section bodyClassName="divide-y divide-line">
                        <div className="hidden items-center gap-4 bg-surface-2/60 px-4 py-2.5 text-xs font-bold text-muted md:flex">
                            <span className="w-8 text-center">#</span>
                            <span className="flex-1">เนื้อหา</span>
                            <span className="w-28">แนวโน้ม</span>
                            <span className="w-24 text-right">{days} วัน</span>
                            <span className="w-24 text-right">สะสม</span>
                        </div>
                        {shown.map((i, idx) => {
                            const rank = (page - 1) * perPage + idx + 1;
                            return (
                                <button key={`${i.type}:${i.id}`} type="button" onClick={() => setDetail(i)} className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-2/60 sm:px-4 md:gap-4">
                                    <span className={cn("tabular grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold", rank <= 3 && sort === "range" ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted")}>{rank}</span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-bold text-fg">{i.title}</span>
                                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                                            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: TYPE[i.type].color }} />{TYPE[i.type].label}</span>
                                            {i.state !== "published" && <Badge tone="amber">{i.state === "draft" ? "ร่าง" : "ตั้งเวลา"}</Badge>}
                                            <Change value={pct(i.rangeViews, i.prevViews)} />
                                            <span className="tabular md:hidden">· {i.rangeViews.toLocaleString()} ครั้ง</span>
                                        </span>
                                    </span>
                                    <span className="hidden w-28 md:block"><Sparkline data={i.series} color={TYPE[i.type].color} width={104} /></span>
                                    <span className="tabular hidden w-24 text-right text-sm font-bold text-fg md:block">{i.rangeViews.toLocaleString()}</span>
                                    <span className="tabular hidden w-24 text-right text-sm text-muted md:block">{i.totalViews.toLocaleString()}</span>
                                </button>
                            );
                        })}
                    </Section>
                )}
                {data && rows.length > perPage && (
                    <div className="flex justify-end">
                        <Pagination currentPage={page} totalPages={totalPages} itemsPerPage={perPage} totalItems={rows.length} onPageChange={setPage} onItemsPerPageChange={setPerPage} />
                    </div>
                )}
            </section>

            <Modal open={!!detail} onClose={() => setDetail(null)} size="lg" title={detail?.title ?? ""} description={detail ? `${TYPE[detail.type].label} · ยอดสะสม ${detail.totalViews.toLocaleString()} ครั้ง` : undefined}
                footer={detail && <Link href={detail.href} className="btn-primary"><ExternalLink className="size-4" /> เปิดหน้าแก้ไข</Link>}
            >
                {detail && data && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { l: `${days} วันนี้`, v: detail.rangeViews },
                                { l: "ช่วงก่อนหน้า", v: detail.prevViews },
                                { l: "เฉลี่ยต่อวัน", v: Math.round((detail.rangeViews / data.days.length) * 10) / 10 },
                            ].map((k) => (
                                <div key={k.l} className="rounded-2xl bg-surface-2 p-3 text-center">
                                    <p className="tabular font-display text-xl font-bold text-fg">{k.v.toLocaleString()}</p>
                                    <p className="text-[11px] text-muted">{k.l}</p>
                                </div>
                            ))}
                        </div>
                        <ItemLineChart days={data.days} series={detail.series} color={TYPE[detail.type].color} />
                    </div>
                )}
            </Modal>
        </div>
    );
}
