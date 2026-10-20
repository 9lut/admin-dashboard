"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Copy, ExternalLink, HardDrive, ImageOff, Link2, Loader2, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import api, { handleApiError } from "@/lib/axios";
import { unwrapResponse, type ApiEnvelope } from "@/lib/axios/types";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { ListToolbar, ToolbarSelect } from "@/app/components/ui/ListToolbar";
import { Badge, EmptyState, Modal, Section, Segmented } from "@/app/components/ui/kit";
import { Skeleton } from "@/app/components/ui/skeleton";
import { useSelection } from "@/app/components/ui/list";
import { fetchMedia, type MediaItem } from "@/app/components/content/MediaPicker";
import { useAuth } from "@/hooks/useAuth";
import { CONTENT, type ContentType } from "@/lib/content/types";
import { toTime } from "@/lib/format";
import { toastUtils } from "@/lib/toast";
import { cn } from "@/lib/utils";

const STATUS = {
    used: { label: "ใช้อยู่", tone: "green" as const },
    history: { label: "อยู่ในประวัติ/ถังขยะ", tone: "amber" as const },
    unused: { label: "ไม่ได้ใช้", tone: "red" as const },
};
const size = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);
const PAGE = 60;

export default function MediaPage() {
    const { isSuperAdmin } = useAuth();
    const [items, setItems] = useState<MediaItem[] | null>(null);
    const [error, setError] = useState("");
    const [status, setStatus] = useState<"all" | "used" | "history" | "unused">("all");
    const [type, setType] = useState("");
    const [age, setAge] = useState("");
    const [search, setSearch] = useState("");
    const [limit, setLimit] = useState(PAGE);
    const [detail, setDetail] = useState<MediaItem | null>(null);
    const [confirmDel, setConfirmDel] = useState<string[] | null>(null);
    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [link, setLink] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);
    const sel = useSelection();
    const [now] = useState(() => Date.now());

    const load = useCallback(async (refresh = false) => {
        setError("");
        try {
            setItems(await fetchMedia(refresh));
        } catch (e) {
            setError(handleApiError(e));
        }
    }, []);
    useEffect(() => {
        void load();
    }, [load]);

    const counts = useMemo(() => {
        const c = { all: 0, used: 0, history: 0, unused: 0, unusedBytes: 0, totalBytes: 0 };
        for (const i of items ?? []) {
            c.all++;
            c[i.status]++;
            c.totalBytes += i.size;
            if (i.status === "unused") c.unusedBytes += i.size;
        }
        return c;
    }, [items]);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (items ?? []).filter(
            (i) =>
                (status === "all" || i.status === status) &&
                (!type || i.usage.some((u) => u.type === type)) &&
                (!age || now - toTime(i.uploadedAt) > Number(age) * 86400000) &&
                (!q || i.usage.some((u) => (u.title ?? "").toLowerCase().includes(q)) || i.key.includes(q)),
        );
    }, [items, status, type, age, search, now]);
    const shown = rows.slice(0, limit);
    const selectable = shown.filter((i) => i.status === "unused").map((i) => i.key);

    const upload = async (files: FileList | null) => {
        if (!files?.length) return;
        setUploading(true);
        try {
            const fd = new FormData();
            Array.from(files).slice(0, 20).forEach((f) => fd.append("files", f));
            const r = unwrapResponse(await api.post<ApiEnvelope<{ urls: string[] }>>("/media", fd, { headers: { "Content-Type": "multipart/form-data" } }));
            toastUtils.success("อัปโหลดแล้ว", `เพิ่มเข้าคลัง ${r.urls.length} รูป`);
            await load(true);
        } catch (e) {
            toastUtils.error("อัปโหลดไม่สำเร็จ", handleApiError(e));
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const importLink = async () => {
        if (!link.trim()) return;
        setUploading(true);
        try {
            await api.post("/media/import", { url: link.trim() });
            setLink("");
            toastUtils.success("ดึงรูปจากลิงก์แล้ว", "เพิ่มเข้าคลังรูปเรียบร้อย");
            await load(true);
        } catch (e) {
            toastUtils.error("ดึงรูปไม่สำเร็จ", handleApiError(e));
        } finally {
            setUploading(false);
        }
    };

    const remove = async () => {
        if (!confirmDel) return;
        setBusy(true);
        try {
            const r = unwrapResponse(await api.delete<ApiEnvelope<{ deleted: number; blocked: string[] }>>("/media", { data: { keys: confirmDel } }));
            toastUtils.success("ลบรูปแล้ว", `ลบ ${r.deleted} รูป${r.blocked.length ? ` · ข้าม ${r.blocked.length} รูปที่ยังถูกใช้` : ""}`);
            sel.clear();
            setConfirmDel(null);
            setDetail(null);
            await load(true);
        } catch (e) {
            toastUtils.error("ลบไม่สำเร็จ", handleApiError(e));
        } finally {
            setBusy(false);
        }
    };

    const copy = (url: string) => {
        void navigator.clipboard?.writeText(url);
        toastUtils.success("คัดลอกลิงก์แล้ว", "");
    };

    return (
        <div className="w-full space-y-5">
            <PageHeader title="คลังรูป" description="รูปทั้งหมดของเว็บไซต์ — ใช้ซ้ำได้หลายเนื้อหา และเคลียร์รูปที่ไม่มีที่ใช้เพื่อประหยัดพื้นที่" art="gallery">
                <button type="button" className="btn-secondary" onClick={() => load(true)} aria-label="รีเฟรช">
                    <RefreshCw className="size-4" />
                </button>
                <button type="button" className="btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} อัปโหลดรูป
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
            </PageHeader>

            {/* สรุปพื้นที่ */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                    { label: "รูปทั้งหมด", value: counts.all.toLocaleString(), sub: size(counts.totalBytes), icon: HardDrive, tone: "bg-primary-soft text-primary", on: "all" },
                    { label: "ใช้อยู่", value: counts.used.toLocaleString(), sub: "แสดงบนเว็บ", icon: Check, tone: "bg-positive-soft text-positive", on: "used" },
                    { label: "อยู่ในประวัติ/ถังขยะ", value: counts.history.toLocaleString(), sub: "เก็บไว้เผื่อย้อนกลับ", icon: RefreshCw, tone: "bg-warning-soft text-warning", on: "history" },
                    { label: "ไม่ได้ใช้", value: counts.unused.toLocaleString(), sub: `ลบได้ ${size(counts.unusedBytes)}`, icon: ImageOff, tone: "bg-negative-soft text-negative", on: "unused" },
                ].map((c) =>
                    !items ? (
                        <Skeleton key={c.label} className="h-[84px] rounded-2xl" />
                    ) : (
                        <button key={c.label} type="button" onClick={() => setStatus(c.on as typeof status)} className={cn("flex items-center gap-3 rounded-2xl border bg-surface p-3 text-left shadow-card transition-colors", status === c.on ? "border-primary" : "border-line hover:border-primary/40")}>
                            <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", c.tone)}>
                                <c.icon className="size-5" />
                            </span>
                            <span className="min-w-0">
                                <span className="tabular block font-display text-xl leading-tight font-bold text-fg">{c.value}</span>
                                <span className="block truncate text-xs text-muted">{c.label} · {c.sub}</span>
                            </span>
                        </button>
                    ),
                )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                    <Link2 className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                    <input className="input pl-10" type="url" value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => e.key === "Enter" && importLink()} placeholder="วางลิงก์รูปหรือลิงก์โพสต์ (เช่น Facebook) เพื่อเก็บเข้าคลัง" />
                </div>
                <button type="button" className="btn-secondary" onClick={importLink} disabled={!link.trim() || uploading}>
                    <Plus className="size-4" /> ดึงรูปจากลิงก์
                </button>
            </div>

            <ListToolbar
                search={search}
                onSearch={setSearch}
                placeholder="ค้นจากชื่อเนื้อหาที่ใช้รูป…"
                activeFilters={[type, age].filter(Boolean).length + (status !== "all" ? 1 : 0)}
                onClear={() => {
                    setStatus("all");
                    setType("");
                    setAge("");
                    setSearch("");
                }}
                filters={
                    <>
                        <ToolbarSelect label="ประเภทเนื้อหา" value={type} onChange={setType} allLabel="ทุกประเภท" options={(Object.keys(CONTENT) as ContentType[]).map((t) => ({ value: t, label: CONTENT[t].label }))} />
                        <ToolbarSelect label="อายุไฟล์" value={age} onChange={setAge} allLabel="ทุกช่วงเวลา" options={[{ value: "7", label: "เก่ากว่า 7 วัน" }, { value: "30", label: "เก่ากว่า 30 วัน" }, { value: "180", label: "เก่ากว่า 6 เดือน" }]} />
                    </>
                }
                right={<Segmented label="สถานะ" value={status} onChange={setStatus} options={[{ id: "all", label: "ทั้งหมด" }, { id: "used", label: "ใช้อยู่" }, { id: "unused", label: "ไม่ได้ใช้" }]} />}
                summary={items && `แสดง ${shown.length.toLocaleString()} จาก ${rows.length.toLocaleString()} รูป`}
            />

            {isSuperAdmin && sel.size > 0 && (
                <div className="flex items-center gap-2 rounded-2xl border border-negative/30 bg-negative-soft p-3 text-sm">
                    <span className="flex-1 font-bold text-negative">เลือก {sel.size} รูปที่ไม่ได้ใช้</span>
                    <button type="button" className="btn-ghost btn-sm" onClick={sel.clear}>ยกเลิก</button>
                    <button type="button" className="btn-sm btn bg-negative text-white" onClick={() => setConfirmDel([...sel.ids])}>
                        <Trash2 className="size-3.5" /> ลบถาวร
                    </button>
                </div>
            )}
            {isSuperAdmin && status === "unused" && selectable.length > 0 && sel.size === 0 && (
                <button type="button" className="btn-secondary btn-sm" onClick={() => sel.setMany(selectable, true)}>เลือกรูปที่ไม่ได้ใช้ทั้งหน้า ({selectable.length})</button>
            )}

            {error ? (
                <Section>
                    <EmptyState art="gallery" title="โหลดคลังรูปไม่สำเร็จ" description={error} action={<button type="button" className="btn-primary" onClick={() => load(true)}>ลองใหม่</button>} />
                </Section>
            ) : !items ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8">
                    {Array.from({ length: 18 }, (_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
                </div>
            ) : shown.length === 0 ? (
                <Section>
                    <EmptyState art="gallery" title={items.length ? "ไม่มีรูปตรงกับตัวกรอง" : "ยังไม่มีรูปในคลัง"} />
                </Section>
            ) : (
                <>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8">
                        {shown.map((i) => {
                            const on = sel.has(i.key);
                            return (
                                <div key={i.key} className={cn("group relative aspect-square overflow-hidden rounded-2xl border-2 bg-surface-2", on ? "border-negative" : "border-transparent")}>
                                    <button type="button" onClick={() => setDetail(i)} className="absolute inset-0" aria-label={i.usage[0]?.title ?? "รูปที่ไม่ได้ใช้"}>
                                        <Image src={i.url} alt="" fill sizes="(max-width:640px) 33vw, 160px" className="object-cover transition-transform group-hover:scale-105" />
                                    </button>
                                    <span className={cn("pointer-events-none absolute bottom-1.5 left-1.5 size-2.5 rounded-full ring-2 ring-white", i.status === "used" ? "bg-positive" : i.status === "history" ? "bg-warning" : "bg-negative")} title={STATUS[i.status].label} />
                                    {isSuperAdmin && i.status === "unused" && (
                                        <button type="button" onClick={() => sel.toggle(i.key)} aria-pressed={on} aria-label="เลือกเพื่อลบ" className={cn("absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-md border-2 shadow", on ? "border-negative bg-negative text-white" : "border-white bg-black/25 text-transparent")}>
                                            <Check className="size-3.5" strokeWidth={3} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {rows.length > shown.length && (
                        <div className="flex justify-center">
                            <button type="button" className="btn-secondary" onClick={() => setLimit((l) => l + PAGE)}>แสดงเพิ่ม ({(rows.length - shown.length).toLocaleString()})</button>
                        </div>
                    )}
                </>
            )}

            <Modal open={!!detail} onClose={() => setDetail(null)} size="md" title="รายละเอียดรูป" description={detail ? `${size(detail.size)} · อัปโหลด ${new Date(detail.uploadedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}` : undefined}
                footer={
                    detail && (
                        <>
                            <button type="button" className="btn-secondary" onClick={() => copy(detail.url)}>
                                <Copy className="size-4" /> คัดลอกลิงก์
                            </button>
                            {isSuperAdmin && detail.status === "unused" && (
                                <button type="button" className="btn bg-negative text-white" onClick={() => setConfirmDel([detail.key])}>
                                    <Trash2 className="size-4" /> ลบรูปนี้
                                </button>
                            )}
                        </>
                    )
                }
            >
                {detail && (
                    <div className="space-y-3">
                        <div className="relative aspect-video overflow-hidden rounded-2xl bg-surface-2">
                            <Image src={detail.url} alt="" fill sizes="600px" className="object-contain" />
                        </div>
                        <Badge tone={STATUS[detail.status].tone}>{STATUS[detail.status].label}</Badge>
                        {detail.usage.length > 0 ? (
                            <ul className="divide-y divide-line rounded-2xl border border-line">
                                {detail.usage.map((u, idx) => (
                                    <li key={idx} className="flex items-center gap-2 px-3 py-2 text-sm">
                                        <span className="min-w-0 flex-1 truncate">
                                            {u.kind === "settings" ? "หน้าติดต่อ & บริจาค" : u.title}
                                            <span className="ml-1.5 text-xs text-muted">
                                                {u.kind === "revision" ? "· ในประวัติการแก้ไข" : u.kind === "trash" ? "· ในถังขยะ" : u.type ? `· ${CONTENT[u.type as ContentType]?.label}` : ""}
                                            </span>
                                        </span>
                                        {u.href && (
                                            <Link href={u.href} className="text-primary" aria-label="เปิดเนื้อหา">
                                                <ExternalLink className="size-4" />
                                            </Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted">รูปนี้ไม่ได้ถูกใช้ในเนื้อหาใด ๆ</p>
                        )}
                    </div>
                )}
            </Modal>

            <Modal
                open={!!confirmDel}
                onClose={() => !busy && setConfirmDel(null)}
                title={`ลบรูป ${confirmDel?.length ?? 0} รูปถาวร?`}
                description="ลบออกจากพื้นที่จัดเก็บจริง ย้อนกลับไม่ได้ — ระบบจะตรวจซ้ำและข้ามรูปที่ยังถูกใช้ให้อัตโนมัติ"
                footer={
                    <>
                        <button type="button" className="btn-secondary" onClick={() => setConfirmDel(null)} disabled={busy}>ยกเลิก</button>
                        <button type="button" className="btn bg-negative text-white" onClick={remove} disabled={busy}>
                            {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} ลบถาวร
                        </button>
                    </>
                }
            />
        </div>
    );
}
