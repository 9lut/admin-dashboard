"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AlertCircle, ArrowRight, CalendarClock, CalendarDays, Eye, FilePen, Globe, MapPin, MousePointerClick, RefreshCw, Users } from "lucide-react";
import api from "@/lib/axios";
import { unwrapResponse, type ApiEnvelope } from "@/lib/axios/types";
import { dashboardApi } from "@/lib/api/dashboard";
import { fetchContentStats, type ContentStats } from "@/lib/api/stats";
import { activityService } from "@/services/activityService";
import type { ActivityListItem } from "@/types/activity";
import type { NotificationItem } from "@/lib/notifications";
import { RecentLogsTable } from "@/app/components/RecentLogsTable";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Section, Segmented } from "@/app/components/ui/kit";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Illustration } from "@/app/components/brand/Illustration";
import { Sparkline } from "@/app/components/chart/Sparkline";
import { Change } from "@/app/components/chart/Change";
import { useAuth } from "@/hooks/useAuth";
import { useMenuAccess } from "@/hooks/useMenuAccess";
import { toTime } from "@/lib/format";
import { cn } from "@/lib/utils";

// กราฟ (recharts) โหลดแยกหลังหน้าแสดงแล้ว
const box = (h = 280) => <Skeleton className="w-full rounded-2xl" style={{ height: h }} />;
const StackedViewsChart = dynamic(() => import("@/app/components/chart/ViewsCharts").then((m) => m.StackedViewsChart), { ssr: false, loading: () => box(300) });
const DonutChart = dynamic(() => import("@/app/components/chart/ViewsCharts").then((m) => m.DonutChart), { ssr: false, loading: () => box(200) });
const SystemActivityChart = dynamic(() => import("@/app/components/chart/SystemActivityChart").then((m) => m.SystemActivityChart), { ssr: false, loading: () => box() });
const LoginActivityChart = dynamic(() => import("@/app/components/chart/LoginActivityChart").then((m) => m.LoginActivityChart), { ssr: false, loading: () => box() });
const ActionDistributionChart = dynamic(() => import("@/app/components/chart/ActionDistributionChart").then((m) => m.ActionDistributionChart), { ssr: false, loading: () => box(250) });

/* eslint-disable @typescript-eslint/no-explicit-any -- payload ของ API แดชบอร์ดเดิมยังไม่มี type กลาง */
type Totals = { users?: number; activities?: number; news?: number; blogs?: number; prayerRooms?: number };
type Charts = Awaited<ReturnType<typeof dashboardApi.getDashboardCharts>>;
type RangeId = "7" | "30" | "90";

const TYPE: Record<string, { label: string; color: string; art: string; href: string; total: keyof Totals }> = {
    news: { label: "ข่าวสาร", color: "#1468c2", art: "news", href: "/admin/news", total: "news" },
    activities: { label: "กิจกรรม", color: "#0299d1", art: "activities", href: "/admin/activity", total: "activities" },
    blog: { label: "บทความ", color: "#e3a52f", art: "blog", href: "/admin/blog/content", total: "blogs" },
    "prayer-rooms": { label: "ห้องละหมาด", color: "#14b8a6", art: "prayer-room", href: "/admin/prayer-rooms", total: "prayerRooms" },
};

function greeting() {
    const h = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Bangkok" }));
    return h < 12 ? "อรุณสวัสดิ์" : h < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";
}
const pct = (cur: number, prev: number) => (prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : null);
const sum = (a: number[] = []) => a.reduce((x, y) => x + y, 0);

function Retry({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl bg-negative-soft p-4 text-center">
            <AlertCircle className="size-5 text-negative" />
            <p className="text-sm font-bold text-negative">{message}</p>
            <button type="button" onClick={onRetry} className="btn-secondary btn-sm"><RefreshCw className="size-3.5" /> ลองใหม่</button>
        </div>
    );
}

function Group({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-bold text-fg before:h-4 before:w-1 before:rounded-full before:bg-primary">{title}</h2>
                {action}
            </div>
            {children}
        </section>
    );
}

export default function AdminDashboard() {
    const { user, isSuperAdmin } = useAuth();
    const { can } = useMenuAccess();
    const [range, setRange] = useState<RangeId>("30");

    const [totals, setTotals] = useState<Totals | null>(null);
    const [period, setPeriod] = useState<Totals | null>(null);
    const [stats, setStats] = useState<ContentStats | null>(null);
    const [charts, setCharts] = useState<Charts | null>(null);
    const [activities, setActivities] = useState<ActivityListItem[] | null>(null);
    const [todo, setTodo] = useState<NotificationItem[] | null>(null);
    const [cf, setCf] = useState<Record<string, number> | null>(null);
    const [logs, setLogs] = useState<any[] | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [now] = useState(() => Date.now());

    // ข้อมูลที่ขึ้นกับช่วงเวลา
    const loadRange = useCallback(async (r: RangeId) => {
        setErrors({});
        setStats(null);
        setCharts(null);
        const since = new Date(Date.now() - Number(r) * 86400000).toISOString();
        const [s, st, ch] = await Promise.allSettled([dashboardApi.getSummary(since), fetchContentStats(Number(r)), dashboardApi.getDashboardCharts(since)]);
        const errs: Record<string, string> = {};
        if (s.status === "fulfilled") {
            const d = s.value as Record<string, unknown>;
            setTotals((d.totals as Totals) ?? null);
            setPeriod((d.period as Totals) ?? null);
        } else errs.summary = "x";
        if (st.status === "fulfilled") setStats(st.value);
        else errs.stats = "x";
        if (ch.status === "fulfilled") setCharts(ch.value);
        else errs.charts = "x";
        setErrors(errs);
    }, []);

    // ข้อมูลที่ไม่ขึ้นกับช่วงเวลา (ไม่มีสิทธิ์ส่วนไหนก็ข้ามเงียบ ๆ)
    const loadStatic = useCallback(async () => {
        const [acts, notif, lg] = await Promise.allSettled([
            can("/admin/activity") ? activityService.getAll() : Promise.resolve([] as ActivityListItem[]),
            api.get<ApiEnvelope<{ items: NotificationItem[] }>>("/notifications").then(unwrapResponse),
            isSuperAdmin ? dashboardApi.getRecentLogsPage(1, 8) : Promise.resolve({ rows: [] }),
        ]);
        setActivities(acts.status === "fulfilled" ? acts.value : []);
        setTodo(notif.status === "fulfilled" ? notif.value.items : []);
        setLogs(lg.status === "fulfilled" ? (((lg.value as { rows?: unknown[] }).rows ?? []) as any[]) : []);
        if (isSuperAdmin) dashboardApi.getCloudflareAnalytics().then((r) => setCf(r as Record<string, number>)).catch(() => setCf({}));
    }, [can, isSuperAdmin]);

    useEffect(() => {
        void loadRange(range);
    }, [range, loadRange]);
    useEffect(() => {
        void loadStatic();
    }, [loadStatic]);

    const today = useMemo(() => new Date().toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" }), []);

    // สถานะเผยแพร่แยกประเภท (จากข้อมูลสถิติ)
    const states = useMemo(() => {
        const out: Record<string, { published: number; scheduled: number; draft: number }> = {};
        for (const t of Object.keys(TYPE)) out[t] = { published: 0, scheduled: 0, draft: 0 };
        for (const i of stats?.items ?? []) {
            const s = (out[i.type] ??= { published: 0, scheduled: 0, draft: 0 });
            if (i.state === "draft") s.draft++;
            else if (i.state === "scheduled") s.scheduled++;
            else s.published++;
        }
        return out;
    }, [stats]);
    const pending = Object.values(states).reduce((a, s) => ({ draft: a.draft + s.draft, scheduled: a.scheduled + s.scheduled }), { draft: 0, scheduled: 0 });

    const upcoming = useMemo(
        () =>
            (activities ?? [])
                .filter((a) => toTime(a.start_date) && toTime(a.end_date || a.start_date) >= now - 86400000)
                .sort((a, b) => toTime(a.start_date) - toTime(b.start_date))
                .slice(0, 5),
        [activities, now],
    );
    const top = (stats?.items ?? []).filter((i) => i.rangeViews > 0).slice(0, 6);
    const typeViews = Object.keys(TYPE).map((t) => ({ t, cur: sum(stats?.byType[t]), prev: (stats?.items ?? []).filter((i) => i.type === t).reduce((s, i) => s + i.prevViews, 0) }));

    return (
        <div className="space-y-8">
            <PageHeader title="ภาพรวมระบบ" description="สรุปข้อมูลเว็บไซต์ชมรมมุสลิม ม.อ.หาดใหญ่ ทั้งหมดในที่เดียว">
                <Segmented label="ช่วงเวลา" value={range} onChange={setRange} options={[{ id: "7", label: "7 วัน" }, { id: "30", label: "30 วัน" }, { id: "90", label: "90 วัน" }]} />
            </PageHeader>

            {/* ทักทาย + สิ่งที่ต้องทำ */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="hero-bg animate-in relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-3xl p-6 text-white shadow-[0_20px_40px_-20px_rgba(15,74,150,0.6)] sm:p-7 xl:col-span-2">
                    <div className="absolute -top-16 -right-10 size-64 rounded-full bg-white/10 blur-3xl" aria-hidden />
                    <div className="relative z-10 max-w-[68%] sm:max-w-[62%]">
                        <p className="text-xs font-bold text-white/75">{today}</p>
                        <p className="mt-1 font-display text-xl font-bold sm:text-3xl">{greeting()}, {user?.firstName || "ผู้ดูแล"} <span aria-hidden>👋</span></p>
                        <p className="mt-2 text-sm text-white/80">
                            {stats ? <>เว็บไซต์มีผู้เข้าชม <b className="text-white">{stats.rangeTotal.toLocaleString()}</b> ครั้งใน {range} วันที่ผ่านมา</> : "กำลังสรุปข้อมูลล่าสุด…"}
                        </p>
                    </div>
                    <div className="relative z-10 mt-5 flex flex-wrap gap-2">
                        {[
                            { href: "/admin/news/create", label: "เขียนข่าว", base: "/admin/news" },
                            { href: "/admin/activity/create", label: "เพิ่มกิจกรรม", base: "/admin/activity" },
                            { href: "/admin/blog/content/create", label: "เขียนบทความ", base: "/admin/blog/content" },
                        ]
                            .filter((q) => can(q.base))
                            .map((q) => (
                                <Link key={q.href} href={q.href} prefetch={false} className="rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-white/25">
                                    + {q.label}
                                </Link>
                            ))}
                    </div>
                    <Illustration name="welcome" className="absolute -right-4 bottom-0 size-32 opacity-90 sm:right-6 sm:size-48 sm:opacity-100" />
                </div>

                <Section title="สิ่งที่ต้องทำ" description="อัปเดตอัตโนมัติจากข้อมูลในระบบ" bodyClassName="p-3">
                    {!todo || (!stats && !errors.stats) ? (
                        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
                    ) : (
                        <ul className="space-y-1.5">
                            {pending.scheduled > 0 && (
                                <li className="flex items-center gap-3 rounded-2xl bg-primary-soft/50 p-2.5">
                                    <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-fg"><CalendarClock className="size-4" /></span>
                                    <span className="flex-1 text-sm"><b>{pending.scheduled}</b> รายการตั้งเวลาเผยแพร่ไว้</span>
                                </li>
                            )}
                            {pending.draft > 0 && (
                                <li className="flex items-center gap-3 rounded-2xl bg-warning-soft p-2.5">
                                    <span className="grid size-9 place-items-center rounded-xl bg-warning text-white"><FilePen className="size-4" /></span>
                                    <span className="flex-1 text-sm"><b>{pending.draft}</b> ฉบับร่างยังไม่เผยแพร่</span>
                                </li>
                            )}
                            {todo.slice(0, 4).map((n) => (
                                <li key={n.id}>
                                    <Link href={n.href} className="flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-surface-2">
                                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2"><Illustration name={n.art} className="size-7" /></span>
                                        <span className="min-w-0 flex-1">
                                            <span className="line-clamp-1 text-sm font-bold text-fg">{n.title}</span>
                                            <span className="line-clamp-1 text-xs text-muted">{n.body}</span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                            {!todo.length && !pending.draft && !pending.scheduled && (
                                <li className="flex flex-col items-center py-6 text-center">
                                    <Illustration name="empty" className="size-14" />
                                    <p className="mt-1 text-sm font-bold text-fg">เรียบร้อยดี ไม่มีงานค้าง</p>
                                </li>
                            )}
                        </ul>
                    )}
                </Section>
            </div>

            {/* ตัวเลขหลัก */}
            <Group title="ตัวเลขสำคัญ">
                {errors.summary && errors.stats ? (
                    <Retry message="โหลดตัวเลขสรุปไม่สำเร็จ" onRetry={() => loadRange(range)} />
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
                        {!stats || !totals ? (
                            Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[138px] rounded-2xl" />)
                        ) : (
                            <>
                                <div className="col-span-2 flex flex-col justify-between rounded-2xl bg-gradient-to-br from-sky-600 to-sky-800 p-4 text-white shadow-card md:col-span-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="flex items-center gap-1.5 text-xs font-bold whitespace-nowrap text-white/85"><Eye className="size-3.5 shrink-0" /> ยอดเข้าชม</p>
                                        <Change value={stats.change} className="bg-white/15 text-white" />
                                    </div>
                                    <p className="tabular mt-2 font-display text-3xl font-bold">{stats.rangeTotal.toLocaleString()}</p>
                                    <div className="mt-2"><Sparkline data={stats.total} color="#ffffff" width={150} height={30} /></div>
                                </div>
                                {Object.entries(TYPE).map(([t, d]) => {
                                    const v = typeViews.find((x) => x.t === t)!;
                                    return (
                                        <Link key={t} href={can(d.href) ? d.href : "/admin"} prefetch={false} className="group flex flex-col rounded-2xl border border-line bg-surface p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-pop">
                                            <div className="flex items-center gap-2.5">
                                                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft"><Illustration name={d.art} className="size-8" /></span>
                                                <span className="min-w-0 text-sm leading-tight font-bold text-fg-2">{d.label}</span>
                                            </div>
                                            <p className="tabular mt-3 font-display text-2xl font-bold text-fg">{(totals[d.total] ?? 0).toLocaleString()}</p>
                                            <p className="mt-0.5 text-[11px] text-muted">
                                                {period?.[d.total] ? `+${period[d.total]} ใหม่` : "ไม่มีรายการใหม่"} · {v.cur.toLocaleString()} วิว
                                            </p>
                                            <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                                                <Sparkline data={stats.byType[t] ?? []} color={d.color} width={80} height={22} />
                                                <Change value={pct(v.cur, v.prev)} />
                                            </div>
                                        </Link>
                                    );
                                })}
                                <Link href={can("/admin/users") ? "/admin/users" : "/admin"} prefetch={false} className="flex flex-col rounded-2xl border border-line bg-surface p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-pop">
                                    <div className="flex items-center gap-2.5">
                                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft"><Illustration name="users" className="size-8" /></span>
                                        <span className="text-sm font-bold text-fg-2">ผู้ใช้งานระบบ</span>
                                    </div>
                                    <p className="tabular mt-3 font-display text-2xl font-bold text-fg">{(totals.users ?? 0).toLocaleString()}</p>
                                    <p className="mt-0.5 text-[11px] text-muted">{period?.users ? `+${period.users} ใหม่ใน ${range} วัน` : "ไม่มีบัญชีใหม่"}</p>
                                </Link>
                            </>
                        )}
                    </div>
                )}
            </Group>

            {/* การเข้าชม */}
            <Group title="การเข้าชมเว็บไซต์" action={can("/admin/stats") && <Link href="/admin/stats" className="btn-ghost btn-sm">สถิติละเอียด <ArrowRight className="size-3.5" /></Link>}>
                {errors.stats ? (
                    <Retry message="โหลดสถิติการเข้าชมไม่สำเร็จ" onRetry={() => loadRange(range)} />
                ) : (
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                        <Section title="ยอดเข้าชมรายวัน" description="แยกตามประเภทเนื้อหา" className="xl:col-span-2" bodyClassName="p-4 sm:p-5">
                            {stats ? <StackedViewsChart days={stats.days} byType={stats.byType} /> : box(300)}
                        </Section>
                        <Section title="เนื้อหายอดนิยม" description={`${range} วันที่ผ่านมา`} bodyClassName="p-2">
                            {!stats ? (
                                <div className="space-y-2 p-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
                            ) : top.length === 0 ? (
                                <div className="flex flex-col items-center py-10 text-center">
                                    <Illustration name="analytics" className="size-16" />
                                    <p className="mt-2 text-sm text-muted">ยังไม่มีการเข้าชมในช่วงนี้</p>
                                </div>
                            ) : (
                                <ol className="space-y-0.5">
                                    {top.map((i, idx) => (
                                        <li key={`${i.type}:${i.id}`}>
                                            <Link href={i.href} prefetch={false} className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-2">
                                                <span className={cn("tabular grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold", idx < 3 ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted")}>{idx + 1}</span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-bold text-fg">{i.title}</span>
                                                    <span className="flex items-center gap-1 text-[11px] text-muted"><span className="size-1.5 rounded-full" style={{ background: TYPE[i.type].color }} />{TYPE[i.type].label} · {i.rangeViews.toLocaleString()} วิว</span>
                                                </span>
                                                <Sparkline data={i.series} color={TYPE[i.type].color} width={60} height={22} />
                                            </Link>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </Section>
                    </div>
                )}
            </Group>

            {/* เนื้อหา: สถานะ + กิจกรรมที่จะมาถึง + สัดส่วน */}
            <Group title="สถานะเนื้อหา">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Section title="การเผยแพร่" description="เผยแพร่ / ตั้งเวลา / ร่าง" bodyClassName="space-y-3 p-5">
                        {!stats
                            ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-9 rounded-xl" />)
                            : Object.entries(TYPE).map(([t, d]) => {
                                  const s = states[t];
                                  const all = s.published + s.scheduled + s.draft || 1;
                                  return (
                                      <div key={t}>
                                          <div className="mb-1 flex items-center justify-between text-xs">
                                              <span className="font-bold text-fg-2">{d.label}</span>
                                              <span className="tabular text-muted">{s.published} · {s.scheduled} · {s.draft}</span>
                                          </div>
                                          <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-2">
                                              <span className="bg-positive" style={{ width: `${(s.published / all) * 100}%` }} />
                                              <span className="bg-primary" style={{ width: `${(s.scheduled / all) * 100}%` }} />
                                              <span className="bg-warning" style={{ width: `${(s.draft / all) * 100}%` }} />
                                          </div>
                                      </div>
                                  );
                              })}
                        <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-muted">
                            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-positive" /> เผยแพร่</span>
                            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-primary" /> ตั้งเวลา</span>
                            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-warning" /> ร่าง</span>
                        </div>
                    </Section>

                    <Section
                        title="กิจกรรมที่จะมาถึง"
                        actions={can("/admin/activity/calendar") && <Link href="/admin/activity/calendar" className="btn-ghost btn-sm">ปฏิทิน <ArrowRight className="size-3.5" /></Link>}
                        bodyClassName="p-3"
                    >
                        {!activities ? (
                            <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
                        ) : upcoming.length === 0 ? (
                            <div className="flex flex-col items-center py-8 text-center">
                                <Illustration name="calendar" className="size-16" />
                                <p className="mt-2 text-sm text-muted">ยังไม่มีกิจกรรมที่จะมาถึง</p>
                            </div>
                        ) : (
                            <ul className="space-y-1">
                                {upcoming.map((a) => {
                                    const d = new Date(a.start_date!);
                                    const days = Math.ceil((toTime(a.start_date) - now) / 86400000);
                                    return (
                                        <li key={a._id}>
                                            <Link href={`/admin/activity/edit/${a._id}`} prefetch={false} className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-surface-2">
                                                <span className="grid w-12 shrink-0 place-items-center rounded-xl bg-primary-soft py-1.5 text-primary">
                                                    <span className="text-[10px] font-bold">{d.toLocaleDateString("th-TH", { month: "short" })}</span>
                                                    <span className="tabular font-display text-lg leading-none font-bold">{d.getDate()}</span>
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-bold text-fg">{a.name_th}</span>
                                                    <span className="flex items-center gap-1 truncate text-xs text-muted"><MapPin className="size-3 shrink-0" /> {a.location || "—"}</span>
                                                </span>
                                                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", days <= 0 ? "bg-positive-soft text-positive" : days <= 7 ? "bg-primary-soft text-primary" : "bg-surface-2 text-muted")}>
                                                    {days <= 0 ? "วันนี้" : days === 1 ? "พรุ่งนี้" : `อีก ${days} วัน`}
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Section>

                    <Section title="สัดส่วนการเข้าชม" bodyClassName="p-4">
                        {stats ? (
                            <>
                                <DonutChart rows={typeViews.map((v) => ({ label: TYPE[v.t].label, value: v.cur, color: TYPE[v.t].color }))} centerValue={stats.rangeTotal.toLocaleString()} centerLabel="วิว" height={180} />
                                <ul className="mt-3 grid grid-cols-2 gap-1.5">
                                    {typeViews.map((v) => (
                                        <li key={v.t} className="flex items-center gap-1.5 text-xs">
                                            <span className="size-2.5 rounded-full" style={{ background: TYPE[v.t].color }} />
                                            <span className="flex-1 text-fg-2">{TYPE[v.t].label}</span>
                                            <span className="tabular font-bold">{stats.rangeTotal ? Math.round((v.cur / stats.rangeTotal) * 100) : 0}%</span>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        ) : (
                            box(240)
                        )}
                    </Section>
                </div>
            </Group>

            {/* การใช้งานระบบ */}
            <Group title="การใช้งานหลังบ้าน">
                {errors.charts ? (
                    <Retry message="โหลดกราฟการใช้งานไม่สำเร็จ" onRetry={() => loadRange(range)} />
                ) : (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <Section title="การเพิ่ม/แก้ไขข้อมูล" description="จำนวนการกระทำต่อวัน" bodyClassName="p-5">
                            {charts ? <SystemActivityChart data={charts.systemActivity as any[]} /> : box()}
                        </Section>
                        <Section title="การเข้าสู่ระบบ" description="จำนวนครั้งต่อวัน" bodyClassName="p-5">
                            {charts ? <LoginActivityChart data={charts.loginActivity as any[]} /> : box()}
                        </Section>
                        <Section title="ประเภทการกระทำ" bodyClassName="p-5">
                            {charts ? <ActionDistributionChart data={charts.actionDistribution as any[]} /> : box(250)}
                        </Section>
                    </div>
                )}
            </Group>

            {isSuperAdmin && (
                <Group title="ทราฟฟิกจาก Cloudflare">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {[
                            { k: "totalRequests", label: "คำขอทั้งหมด", icon: Globe },
                            { k: "totalPageViews", label: "การเปิดหน้า", icon: MousePointerClick },
                            { k: "totalUniqueVisitors", label: "ผู้เข้าชมไม่ซ้ำ", icon: Users },
                        ].map((c) =>
                            !cf ? (
                                <Skeleton key={c.k} className="h-[84px] rounded-2xl" />
                            ) : (
                                <div key={c.k} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
                                    <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary"><c.icon className="size-5" /></span>
                                    <span>
                                        <span className="tabular block font-display text-xl font-bold text-fg">{(cf[c.k] ?? 0).toLocaleString()}</span>
                                        <span className="text-xs text-muted">{c.label}</span>
                                    </span>
                                </div>
                            ),
                        )}
                    </div>
                </Group>
            )}

            {isSuperAdmin && (
                <Group title="บันทึกระบบล่าสุด" action={<Link href="/admin/log" className="btn-ghost btn-sm">ทั้งหมด <ArrowRight className="size-3.5" /></Link>}>
                    <Section bodyClassName="p-4">{logs ? <RecentLogsTable logs={logs} /> : <div className="space-y-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>}</Section>
                </Group>
            )}

            <p className="flex items-center gap-1.5 text-xs text-muted">
                <CalendarDays className="size-3.5" /> ยอดเข้าชมนับจากการเปิดหน้ารายละเอียดบนเว็บไซต์ (เก็บรายวันตั้งแต่ระบบสถิติเปิดใช้)
            </p>
        </div>
    );
}
