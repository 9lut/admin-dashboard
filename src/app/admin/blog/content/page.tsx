"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Check, Eye, FolderOpen, Pencil, Trash2 } from "lucide-react";
import { blogService } from "@/services/blogService";
import type { BlogGroup, BlogPost } from "@/types/blog";
import DeleteModal from "@/app/components/ui/DeleteModal";
import { Pagination } from "@/app/components/ui/Pagination";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { ListToolbar, ToolbarSelect } from "@/app/components/ui/ListToolbar";
import { Badge, EmptyState, Section } from "@/app/components/ui/kit";
import { BulkBar, TableSkeletonRows, useSelection } from "@/app/components/ui/list";
import { Illustration } from "@/app/components/brand/Illustration";
import { MONTH_OPTIONS, fmtDate } from "@/lib/format";
import { handleApiError } from "@/lib/axios";
import { toastUtils } from "@/lib/toast";
import { batchDelete } from "@/lib/api/batch";
import { cn } from "@/lib/utils";

const SORTS = [
    { value: "createdAt-desc", label: "เพิ่มล่าสุด" },
    { value: "createdAt-asc", label: "เพิ่มเก่าสุด" },
    { value: "views-desc", label: "ยอดเข้าชมมากสุด" },
    { value: "title-asc", label: "ชื่อ ก → ฮ" },
];
const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => ({ value: String(thisYear - i), label: `พ.ศ. ${thisYear - i + 543}` }));
const groupName = (g: BlogPost["group"]) => (typeof g === "string" ? g : g?.name) || "—";

export default function BlogContentPage() {
    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [groups, setGroups] = useState<BlogGroup[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [group, setGroup] = useState("");
    const [status, setStatus] = useState("");
    const [year, setYear] = useState("");
    const [month, setMonth] = useState("");
    const [sort, setSort] = useState("createdAt-desc");
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);

    const sel = useSelection();
    const [toDelete, setToDelete] = useState<BlogPost | "bulk" | null>(null);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        const [sortKey, sortDir] = sort.split("-") as [string, "asc" | "desc"];
        try {
            const res = await blogService.getAll(page, perPage, { search, group, status, month, year, sortKey, sortDir });
            setBlogs(res?.data ?? []);
            setTotal(res?.total ?? 0);
            setTotalPages(res?.totalPages || 1);
        } catch (e) {
            setError(handleApiError(e));
        } finally {
            setLoading(false);
        }
    }, [page, perPage, search, group, status, month, year, sort]);

    useEffect(() => {
        void load();
    }, [load]);
    useEffect(() => {
        blogService.getGroups().then((g) => setGroups(g ?? [])).catch(() => setGroups([]));
    }, []);
    useEffect(() => setPage(1), [search, group, status, month, year, sort, perPage]);

    const groupOptions = useMemo(() => groups.map((g) => ({ value: g._id || g.id || g.name, label: g.name })), [groups]);
    const active = [group, status, year, month].filter(Boolean).length;
    const clear = () => {
        setSearch("");
        setGroup("");
        setStatus("");
        setYear("");
        setMonth("");
    };
    const pageIds = blogs.map((b) => b._id);
    const allOnPage = pageIds.length > 0 && pageIds.every((id) => sel.has(id));

    const confirmDelete = async () => {
        if (!toDelete) return;
        setDeleting(true);
        const ids = toDelete === "bulk" ? [...sel.ids] : [toDelete._id];
        try {
            // ลบในคำขอเดียว (รวมรูปบน R2) แทนการยิงทีละรายการ
            const r = await batchDelete("blog", ids);
            if (r.notFound.length) toastUtils.warning("ลบแล้วบางส่วน", `ลบ ${r.deleted.length} รายการ · ไม่พบ ${r.notFound.length} รายการ (อาจถูกลบไปก่อนแล้ว)`);
            else toastUtils.success("ย้ายไปถังขยะแล้ว", `บทความ ${r.deleted.length} รายการ · กู้คืนได้ที่เมนูถังขยะภายใน 30 วัน`);
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
            <PageHeader title="บทความ" description="บทความและเนื้อหาความรู้ของชมรม" art="blog" action={{ label: "เขียนบทความใหม่", href: "/admin/blog/content/create" }} />

            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 hide-scrollbar">
                {[
                    ["", "ทั้งหมด"],
                    ["published", "เผยแพร่แล้ว"],
                    ["draft", "ฉบับร่าง"],
                ].map(([id, label]) => (
                    <button
                        key={id || "all"}
                        type="button"
                        onClick={() => setStatus(id)}
                        aria-pressed={status === id}
                        className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition-colors", status === id ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface text-fg-2 hover:border-primary/40")}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <ListToolbar
                search={search}
                onSearch={setSearch}
                placeholder="ค้นหาชื่อบทความ, แท็ก…"
                activeFilters={active}
                onClear={clear}
                filters={
                    <>
                        <ToolbarSelect label="กลุ่ม" value={group} onChange={setGroup} allLabel="ทุกกลุ่ม" options={groupOptions} icon={<FolderOpen className="size-4" />} />
                        <ToolbarSelect label="ปี" value={year} onChange={setYear} allLabel="ทุกปี" options={YEARS} icon={<CalendarDays className="size-4" />} />
                        <ToolbarSelect label="เดือน" value={month} onChange={setMonth} allLabel="ทุกเดือน" options={MONTH_OPTIONS} />
                    </>
                }
                sort={{ value: sort, onChange: setSort, options: SORTS }}
                summary={!loading && !error && `พบ ${total.toLocaleString()} บทความ`}
            />

            {error ? (
                <Section>
                    <EmptyState art="blog" title="โหลดบทความไม่สำเร็จ" description={error} action={<button type="button" className="btn-primary" onClick={load}>ลองใหม่</button>} />
                </Section>
            ) : loading ? (
                <TableSkeletonRows />
            ) : blogs.length === 0 ? (
                <Section>
                    <EmptyState
                        art="blog"
                        title={active || search ? "ไม่พบบทความที่ตรงกับตัวกรอง" : "ยังไม่มีบทความ"}
                        description={active || search ? "ลองเปลี่ยนคำค้นหรือล้างตัวกรอง" : "เริ่มเขียนบทความแรก"}
                        action={active || search ? <button type="button" className="btn-secondary" onClick={clear}>ล้างตัวกรอง</button> : <Link href="/admin/blog/content/create" className="btn-primary">เขียนบทความ</Link>}
                    />
                </Section>
            ) : (
                <>
                    <Section bodyClassName="divide-y divide-line">
                        <div className="hidden items-center gap-4 bg-surface-2/60 px-4 py-2.5 text-xs font-bold text-muted md:flex">
                            <button
                                type="button"
                                onClick={() => sel.setMany(pageIds, !allOnPage)}
                                aria-label="เลือกทั้งหน้า"
                                className={cn("grid size-5 place-items-center rounded-md border-2", allOnPage ? "border-primary bg-primary text-primary-fg" : "border-line-strong")}
                            >
                                {allOnPage && <Check className="size-3" strokeWidth={3} />}
                            </button>
                            <span className="flex-1">บทความ</span>
                            <span className="w-32">กลุ่ม</span>
                            <span className="w-24">สถานะ</span>
                            <span className="w-16 text-right">เข้าชม</span>
                            <span className="w-20" />
                        </div>
                        {blogs.map((b) => {
                            const on = sel.has(b._id);
                            return (
                                <div key={b._id} className={cn("flex items-center gap-3 px-3 py-3 transition-colors sm:px-4 md:gap-4", on ? "bg-primary-soft/40" : "hover:bg-surface-2/50")}>
                                    <button
                                        type="button"
                                        onClick={() => sel.toggle(b._id)}
                                        aria-pressed={on}
                                        aria-label={on ? "ยกเลิกเลือก" : "เลือก"}
                                        className={cn("grid size-5 shrink-0 place-items-center rounded-md border-2", on ? "border-primary bg-primary text-primary-fg" : "border-line-strong")}
                                    >
                                        {on && <Check className="size-3" strokeWidth={3} />}
                                    </button>
                                    <Link href={`/admin/blog/content/edit/${b.slug || b._id}`} prefetch={false} className="flex min-w-0 flex-1 items-center gap-3">
                                        <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary-soft sm:h-14 sm:w-20">
                                            {b.coverImage ? <Image src={b.coverImage} alt="" fill sizes="80px" className="object-cover" /> : <Illustration name="blog" className="size-9" />}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="line-clamp-2 text-sm font-bold text-fg hover:text-primary">{b.title}</span>
                                            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                                                {fmtDate(b.publishedAt || b.createdAt)}
                                                <span className="md:hidden">· {groupName(b.group)}</span>
                                                <span className="md:hidden">
                                                    · <Eye className="inline size-3" /> {b.views ?? 0}
                                                </span>
                                            </span>
                                            <span className="mt-1 inline-block md:hidden">
                                                <Badge tone={b.status === "published" ? "green" : "amber"}>{b.status === "published" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}</Badge>
                                            </span>
                                        </span>
                                    </Link>
                                    <span className="hidden w-32 truncate text-sm text-fg-2 md:block">{groupName(b.group)}</span>
                                    <span className="hidden w-24 md:block">
                                        <Badge tone={b.status === "published" ? "green" : "amber"}>{b.status === "published" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}</Badge>
                                    </span>
                                    <span className="tabular hidden w-16 text-right text-sm text-fg-2 md:block">{(b.views ?? 0).toLocaleString()}</span>
                                    <span className="flex w-auto shrink-0 justify-end gap-1 md:w-20">
                                        <Link href={`/admin/blog/content/edit/${b.slug || b._id}`} prefetch={false} className="hidden size-9 place-items-center rounded-xl text-muted hover:bg-primary-soft hover:text-primary sm:grid" aria-label="แก้ไข" title="แก้ไข">
                                            <Pencil className="size-4" />
                                        </Link>
                                        <button type="button" onClick={() => setToDelete(b)} className="grid size-9 place-items-center rounded-xl text-muted hover:bg-negative-soft hover:text-negative" aria-label="ลบ" title="ลบ">
                                            <Trash2 className="size-4" />
                                        </button>
                                    </span>
                                </div>
                            );
                        })}
                    </Section>
                    <div className="flex justify-end">
                        <Pagination currentPage={page} totalPages={totalPages} itemsPerPage={perPage} totalItems={total} onPageChange={setPage} onItemsPerPageChange={setPerPage} />
                    </div>
                </>
            )}

            <BulkBar count={sel.size} pageIds={pageIds} selection={sel} onDelete={() => setToDelete("bulk")} />
            <DeleteModal
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={confirmDelete}
                isDeleting={deleting}
                recoverable
                title={toDelete === "bulk" ? `ลบบทความ ${sel.size} รายการ?` : "ลบบทความนี้?"}
                description="บทความจะถูกลบออกจากเว็บไซต์"
                itemName={toDelete && toDelete !== "bulk" ? toDelete.title : undefined}
            />
        </div>
    );
}
