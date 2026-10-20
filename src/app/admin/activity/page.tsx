"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CalendarRange, MapPin, Star } from "lucide-react";
import { activityService } from "@/services/activityService";
import type { ActivityListItem } from "@/types/activity";
import DeleteModal from "@/app/components/ui/DeleteModal";
import { Pagination } from "@/app/components/ui/Pagination";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { ListToolbar, ToolbarSelect } from "@/app/components/ui/ListToolbar";
import { Badge, EmptyState, Section, type Tone } from "@/app/components/ui/kit";
import { BulkBar, CARD_GRID, CardGridSkeleton, ContentCard, usePaged, useSelection } from "@/app/components/ui/list";
import { fmtShort as fmtDate, includesAll, matchMonthYear, MONTH_OPTIONS, toTime, yearOptions } from "@/lib/format";
import { handleApiError } from "@/lib/axios";
import { publishState } from "@/lib/content/publish";
import { StateBadge } from "@/app/components/content/StateBadge";
import { toastUtils } from "@/lib/toast";
import { batchDelete } from "@/lib/api/batch";

type Phase = "upcoming" | "ongoing" | "past" | "nodate";
const PHASE: Record<Phase, { label: string; tone: Tone }> = {
    upcoming: { label: "กำลังจะจัด", tone: "primary" },
    ongoing: { label: "กำลังจัด", tone: "green" },
    past: { label: "จบแล้ว", tone: "gray" },
    nodate: { label: "ไม่ระบุวัน", tone: "amber" },
};

function phaseOf(a: ActivityListItem, now: number): Phase {
    const s = toTime(a.start_date);
    const e = toTime(a.end_date) || s;
    if (!s) return "nodate";
    if (now < s) return "upcoming";
    if (now <= e + 86400000 - 1) return "ongoing";
    return "past";
}

const SORTS = [
    { value: "start-desc", label: "วันจัด ใหม่ → เก่า" },
    { value: "start-asc", label: "วันจัด เก่า → ใหม่" },
    { value: "created-desc", label: "เพิ่มล่าสุด" },
    { value: "name-asc", label: "ชื่อ ก → ฮ" },
];

export default function ActivityPage() {
    const [items, setItems] = useState<ActivityListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [phase, setPhase] = useState("");
    const [year, setYear] = useState("");
    const [month, setMonth] = useState("");
    const [fav, setFav] = useState("");
    const [state, setState] = useState("");
    const [sort, setSort] = useState("start-desc");
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);

    const sel = useSelection();
    const [toDelete, setToDelete] = useState<ActivityListItem | "bulk" | null>(null);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            setItems(await activityService.getAll());
        } catch (e) {
            setError(handleApiError(e));
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        void load();
    }, [load]);
    useEffect(() => setPage(1), [search, phase, year, month, fav, sort, perPage, state]);

    const now = useMemo(() => Date.now(), []);
    const years = useMemo(() => yearOptions(items.map((a) => a.start_date)), [items]);
    const counts = useMemo(() => {
        const c: Record<Phase, number> = { upcoming: 0, ongoing: 0, past: 0, nodate: 0 };
        for (const a of items) c[phaseOf(a, now)]++;
        return c;
    }, [items, now]);

    const filtered = useMemo(() => {
        const out = items.filter(
            (a) =>
                (!search || includesAll([a.name_th, a.name_eng, a.location, a.description], search)) &&
                (!phase || phaseOf(a, now) === phase) &&
                matchMonthYear(a.start_date, month, year) &&
                (!fav || (fav === "yes" ? a.favorite : !a.favorite)) &&
                (!state || publishState(a, now) === state),
        );
        const [k, d] = sort.split("-");
        const s = d === "asc" ? 1 : -1;
        return out.sort((a, b) =>
            k === "name" ? s * a.name_th.localeCompare(b.name_th, "th") : k === "created" ? s * (toTime(a.createdAt) - toTime(b.createdAt)) : s * (toTime(a.start_date) - toTime(b.start_date)),
        );
    }, [items, search, phase, month, year, fav, sort, now, state]);
    const { rows, totalPages, page: cur } = usePaged(filtered, page, perPage);

    const clear = () => {
        setSearch("");
        setPhase("");
        setYear("");
        setMonth("");
        setFav("");
        setState("");
    };

    const confirmDelete = async () => {
        if (!toDelete) return;
        setDeleting(true);
        const ids = toDelete === "bulk" ? [...sel.ids] : [toDelete._id];
        try {
            // ลบในคำขอเดียว (รวมรูปบน R2) แทนการยิงทีละรายการ
            const r = await batchDelete("activities", ids);
            if (r.notFound.length) toastUtils.warning("ลบแล้วบางส่วน", `ลบ ${r.deleted.length} รายการ · ไม่พบ ${r.notFound.length} รายการ (อาจถูกลบไปก่อนแล้ว)`);
            else toastUtils.success("ย้ายไปถังขยะแล้ว", `กิจกรรม ${r.deleted.length} รายการ · กู้คืนได้ที่เมนูถังขยะภายใน 30 วัน`);
        } catch (e) {
            toastUtils.error("ลบไม่สำเร็จ", handleApiError(e));
        }
        sel.clear();
        setToDelete(null);
        setDeleting(false);
        void load();
    };

    return (
        <div className="w-full space-y-5">
            <PageHeader title="กิจกรรม" description="กิจกรรมของชมรม ทั้งที่ผ่านมาและกำลังจะจัด" art="activities" action={{ label: "เพิ่มกิจกรรมใหม่", href: "/admin/activity/create" }}>
                <Link href="/admin/activity/calendar" className="btn-secondary">
                    <CalendarRange className="size-4" /> <span className="hidden sm:inline">ปฏิทิน</span>
                </Link>
            </PageHeader>

            {/* แท็บสถานะ (แตะเพื่อกรอง) */}
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 hide-scrollbar">
                {([["", "ทั้งหมด", items.length], ...(Object.keys(PHASE) as Phase[]).map((p) => [p, PHASE[p].label, counts[p]])] as [string, string, number][]).map(([id, label, n]) => (
                    <button
                        key={id || "all"}
                        type="button"
                        onClick={() => setPhase(id)}
                        aria-pressed={phase === id}
                        className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${phase === id ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface text-fg-2 hover:border-primary/40"}`}
                    >
                        {label}
                        <span className={`tabular rounded-full px-1.5 text-[11px] ${phase === id ? "bg-white/20" : "bg-surface-2 text-muted"}`}>{loading ? "–" : n}</span>
                    </button>
                ))}
            </div>

            <ListToolbar
                search={search}
                onSearch={setSearch}
                placeholder="ค้นหาชื่อกิจกรรม, สถานที่…"
                activeFilters={[year, month, fav, state].filter(Boolean).length}
                onClear={clear}
                filters={
                    <>
                        <ToolbarSelect label="สถานะเผยแพร่" value={state} onChange={setState} allLabel="ทุกสถานะ" options={[{ value: "published", label: "เผยแพร่แล้ว" }, { value: "scheduled", label: "ตั้งเวลาไว้" }, { value: "draft", label: "ฉบับร่าง" }]} />
                        <ToolbarSelect label="ปีที่จัด" value={year} onChange={setYear} allLabel="ทุกปี" options={years} icon={<CalendarDays className="size-4" />} />
                        <ToolbarSelect label="เดือนที่จัด" value={month} onChange={setMonth} allLabel="ทุกเดือน" options={MONTH_OPTIONS} />
                        <ToolbarSelect label="กิจกรรมเด่น" value={fav} onChange={setFav} allLabel="เด่น/ไม่เด่น" icon={<Star className="size-4" />} options={[{ value: "yes", label: "เฉพาะกิจกรรมเด่น" }, { value: "no", label: "ไม่ใช่กิจกรรมเด่น" }]} />
                    </>
                }
                sort={{ value: sort, onChange: setSort, options: SORTS }}
                summary={!loading && !error && `พบ ${filtered.length.toLocaleString()} จาก ${items.length.toLocaleString()} กิจกรรม`}
            />

            {error ? (
                <Section>
                    <EmptyState art="activities" title="โหลดกิจกรรมไม่สำเร็จ" description={error} action={<button type="button" className="btn-primary" onClick={load}>ลองใหม่</button>} />
                </Section>
            ) : loading ? (
                <CardGridSkeleton />
            ) : filtered.length === 0 ? (
                <Section>
                    <EmptyState
                        art="activities"
                        title={items.length ? "ไม่พบกิจกรรมที่ตรงกับตัวกรอง" : "ยังไม่มีกิจกรรม"}
                        description={items.length ? "ลองเปลี่ยนคำค้นหรือล้างตัวกรอง" : "เพิ่มกิจกรรมแรกของชมรม"}
                        action={items.length ? <button type="button" className="btn-secondary" onClick={clear}>ล้างตัวกรอง</button> : undefined}
                    />
                </Section>
            ) : (
                <>
                    <div className={CARD_GRID}>
                        {rows.map((a) => {
                            const p = phaseOf(a, now);
                            return (
                                <ContentCard
                                    key={a._id}
                                    image={a.images}
                                    title={a.name_th}
                                    subtitle={
                                        <span className="flex items-center gap-1">
                                            <MapPin className="size-3 shrink-0" /> <span className="truncate">{a.location || "—"}</span>
                                        </span>
                                    }
                                    meta={a.start_date ? `${fmtDate(a.start_date)}${a.end_date && fmtDate(a.end_date) !== fmtDate(a.start_date) ? ` – ${fmtDate(a.end_date)}` : ""}` : "ไม่ระบุวัน"}
                                    badges={
                                        <>
                                            <StateBadge state={publishState(a, now)} at={a.publishAt} />
                                            {a.favorite && (
                                                <Badge tone="amber" className="shadow-sm">
                                                    <Star className="size-3 fill-current" /> เด่น
                                                </Badge>
                                            )}
                                            <Badge tone={PHASE[p].tone} className="shadow-sm">{PHASE[p].label}</Badge>
                                        </>
                                    }
                                    art="activities"
                                    editHref={`/admin/activity/edit/${a._id}`}
                                    onDelete={() => setToDelete(a)}
                                    selected={sel.has(a._id)}
                                    onSelect={() => sel.toggle(a._id)}
                                />
                            );
                        })}
                    </div>
                    <div className="flex justify-end">
                        <Pagination currentPage={cur} totalPages={totalPages} itemsPerPage={perPage} totalItems={filtered.length} onPageChange={setPage} onItemsPerPageChange={setPerPage} />
                    </div>
                </>
            )}

            <BulkBar count={sel.size} pageIds={rows.map((r) => r._id)} selection={sel} onDelete={() => setToDelete("bulk")} />
            <DeleteModal
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={confirmDelete}
                isDeleting={deleting}
                recoverable
                title={toDelete === "bulk" ? `ลบกิจกรรม ${sel.size} รายการ?` : "ลบกิจกรรมนี้?"}
                description="รูปภาพของกิจกรรมจะถูกลบไปด้วย"
                itemName={toDelete && toDelete !== "bulk" ? toDelete.name_th : undefined}
            />
        </div>
    );
}
