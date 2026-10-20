"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ImageIcon } from "lucide-react";
import { newsService } from "@/services/newsService";
import type { News } from "@/types/news";
import DeleteModal from "@/app/components/ui/DeleteModal";
import { Pagination } from "@/app/components/ui/Pagination";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { ListToolbar, ToolbarSelect } from "@/app/components/ui/ListToolbar";
import { EmptyState, Section } from "@/app/components/ui/kit";
import { BulkBar, CARD_GRID, CardGridSkeleton, ContentCard, usePaged, useSelection } from "@/app/components/ui/list";
import { MONTH_OPTIONS, fmtShort as fmtDate, includesAll, matchMonthYear, toTime, yearOptions } from "@/lib/format";
import { handleApiError } from "@/lib/axios";
import { publishState } from "@/lib/content/publish";
import { StateBadge } from "@/app/components/content/StateBadge";
import { toastUtils } from "@/lib/toast";
import { batchDelete } from "@/lib/api/batch";

const SORTS = [
    { value: "date-desc", label: "วันที่ข่าว ใหม่ → เก่า" },
    { value: "date-asc", label: "วันที่ข่าว เก่า → ใหม่" },
    { value: "created-desc", label: "เพิ่มล่าสุด" },
    { value: "name-asc", label: "ชื่อ ก → ฮ" },
];

export default function NewsPage() {
    const [news, setNews] = useState<News[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [month, setMonth] = useState("");
    const [year, setYear] = useState("");
    const [image, setImage] = useState("");
    const [state, setState] = useState("");
    const [now] = useState(() => Date.now());
    const [sort, setSort] = useState("date-desc");
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);

    const sel = useSelection();
    const [toDelete, setToDelete] = useState<News | "bulk" | null>(null);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            setNews(await newsService.getAll());
        } catch (e) {
            setError(handleApiError(e));
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        void load();
    }, [load]);
    useEffect(() => setPage(1), [search, month, year, image, sort, perPage, state]);

    const years = useMemo(() => yearOptions(news.map((n) => n.date || n.createdAt)), [news]);
    const filtered = useMemo(() => {
        const out = news.filter(
            (n) =>
                (!search || includesAll([n.name, n.description], search)) &&
                matchMonthYear(n.date || n.createdAt, month, year) &&
                (!image || (image === "with" ? n.images?.length > 0 : !n.images?.length)) &&
                (!state || publishState(n, now) === state),
        );
        const [k, d] = sort.split("-");
        const s = d === "asc" ? 1 : -1;
        return out.sort((a, b) =>
            k === "name" ? s * a.name.localeCompare(b.name, "th") : k === "created" ? s * (toTime(a.createdAt) - toTime(b.createdAt)) : s * (toTime(a.date || a.createdAt) - toTime(b.date || b.createdAt)),
        );
    }, [news, search, month, year, image, sort, state, now]);
    const { rows, totalPages, page: cur } = usePaged(filtered, page, perPage);

    const clear = () => {
        setSearch("");
        setMonth("");
        setYear("");
        setImage("");
        setState("");
    };

    const confirmDelete = async () => {
        if (!toDelete) return;
        setDeleting(true);
        const ids = toDelete === "bulk" ? [...sel.ids] : [toDelete._id];
        try {
            // ลบในคำขอเดียว (รวมรูปบน R2) แทนการยิงทีละรายการ
            const r = await batchDelete("news", ids);
            if (r.notFound.length) toastUtils.warning("ลบแล้วบางส่วน", `ลบ ${r.deleted.length} รายการ · ไม่พบ ${r.notFound.length} รายการ (อาจถูกลบไปก่อนแล้ว)`);
            else toastUtils.success("ย้ายไปถังขยะแล้ว", `ข่าว ${r.deleted.length} รายการ · กู้คืนได้ที่เมนูถังขยะภายใน 30 วัน`);
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
            <PageHeader title="ข่าวสาร" description="ข่าวประชาสัมพันธ์ที่แสดงบนหน้าเว็บไซต์" art="news" action={{ label: "เพิ่มข่าวใหม่", href: "/admin/news/create" }} />

            <ListToolbar
                search={search}
                onSearch={setSearch}
                placeholder="ค้นหาชื่อข่าว, รายละเอียด…"
                activeFilters={[month, year, image, state].filter(Boolean).length}
                onClear={clear}
                filters={
                    <>
                        <ToolbarSelect label="สถานะ" value={state} onChange={setState} allLabel="ทุกสถานะ" options={[{ value: "published", label: "เผยแพร่แล้ว" }, { value: "scheduled", label: "ตั้งเวลาไว้" }, { value: "draft", label: "ฉบับร่าง" }]} />
                        <ToolbarSelect label="ปี" value={year} onChange={setYear} allLabel="ทุกปี" options={years} icon={<CalendarDays className="size-4" />} />
                        <ToolbarSelect label="เดือน" value={month} onChange={setMonth} allLabel="ทุกเดือน" options={MONTH_OPTIONS} />
                        <ToolbarSelect label="รูปภาพ" value={image} onChange={setImage} allLabel="รูปทั้งหมด" icon={<ImageIcon className="size-4" />} options={[{ value: "with", label: "มีรูป" }, { value: "without", label: "ไม่มีรูป" }]} />
                    </>
                }
                sort={{ value: sort, onChange: setSort, options: SORTS }}
                summary={!loading && !error && `พบ ${filtered.length.toLocaleString()} จาก ${news.length.toLocaleString()} ข่าว`}
            />

            {error ? (
                <Section>
                    <EmptyState art="news" title="โหลดข่าวไม่สำเร็จ" description={error} action={<button type="button" className="btn-primary" onClick={load}>ลองใหม่</button>} />
                </Section>
            ) : loading ? (
                <CardGridSkeleton />
            ) : filtered.length === 0 ? (
                <Section>
                    <EmptyState
                        art="news"
                        title={news.length ? "ไม่พบข่าวที่ตรงกับตัวกรอง" : "ยังไม่มีข่าว"}
                        description={news.length ? "ลองเปลี่ยนคำค้นหรือล้างตัวกรอง" : "เริ่มเขียนข่าวแรกเพื่อแสดงบนหน้าเว็บไซต์"}
                        action={news.length ? <button type="button" className="btn-secondary" onClick={clear}>ล้างตัวกรอง</button> : undefined}
                    />
                </Section>
            ) : (
                <>
                    <div className={CARD_GRID}>
                        {rows.map((n) => (
                            <ContentCard
                                key={n._id}
                                image={n.images?.[0]}
                                title={n.name}
                                subtitle={n.description}
                                meta={fmtDate(n.date || n.createdAt)}
                                art="news"
                                badges={<StateBadge state={publishState(n, now)} at={n.publishAt} />}
                                editHref={`/admin/news/edit/${n._id}`}
                                onDelete={() => setToDelete(n)}
                                selected={sel.has(n._id)}
                                onSelect={() => sel.toggle(n._id)}
                            />
                        ))}
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
                title={toDelete === "bulk" ? `ลบข่าว ${sel.size} รายการ?` : "ลบข่าวนี้?"}
                description={toDelete === "bulk" ? "ข่าวที่เลือกทั้งหมดจะถูกลบออกจากเว็บไซต์" : "ข่าวนี้จะถูกลบออกจากเว็บไซต์"}
                itemName={toDelete && toDelete !== "bulk" ? toDelete.name : undefined}
            />
        </div>
    );
}
