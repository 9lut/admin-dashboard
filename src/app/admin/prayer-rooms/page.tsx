"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building, Clock, ImageIcon, MapPin, Sparkles, Users } from "lucide-react";
import { prayerRoomService } from "@/services/prayerRoomService";
import type { PrayerRoom } from "@/types/prayer-room";
import DeleteModal from "@/app/components/ui/DeleteModal";
import { Pagination } from "@/app/components/ui/Pagination";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { ListToolbar, ToolbarSelect } from "@/app/components/ui/ListToolbar";
import { Badge, EmptyState, Section } from "@/app/components/ui/kit";
import { BulkBar, CARD_GRID, CardGridSkeleton, ContentCard, usePaged, useSelection } from "@/app/components/ui/list";
import { includesAll, toTime } from "@/lib/format";
import { handleApiError } from "@/lib/axios";
import { toastUtils } from "@/lib/toast";
import { batchDelete } from "@/lib/api/batch";

const SORTS = [
    { value: "name-asc", label: "ชื่อ ก → ฮ" },
    { value: "capacity-desc", label: "จุคนมากสุด" },
    { value: "created-desc", label: "เพิ่มล่าสุด" },
];
const uniq = (list: (string | undefined)[]) =>
    [...new Set(list.map((s) => s?.trim()).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "th")).map((v) => ({ value: v, label: v }));

export default function PrayerRoomsPage() {
    const [rooms, setRooms] = useState<PrayerRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [faculty, setFaculty] = useState("");
    const [facility, setFacility] = useState("");
    const [image, setImage] = useState("");
    const [sort, setSort] = useState("name-asc");
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);

    const sel = useSelection();
    const [toDelete, setToDelete] = useState<PrayerRoom | "bulk" | null>(null);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            setRooms(await prayerRoomService.getAll());
        } catch (e) {
            setError(handleApiError(e));
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        void load();
    }, [load]);
    useEffect(() => setPage(1), [search, faculty, facility, image, sort, perPage]);

    const faculties = useMemo(() => uniq(rooms.map((r) => r.faculty)), [rooms]);
    const facilities = useMemo(() => uniq(rooms.flatMap((r) => r.facilities ?? [])), [rooms]);

    const filtered = useMemo(() => {
        const out = rooms.filter(
            (r) =>
                (!search || includesAll([r.name, r.name_th, r.name_en, r.place, r.detail, r.faculty, ...(r.facilities ?? [])], search)) &&
                (!faculty || r.faculty?.trim() === faculty) &&
                (!facility || (r.facilities ?? []).some((f) => f.trim() === facility)) &&
                (!image || (image === "with" ? r.images?.length > 0 : !r.images?.length)),
        );
        const [k, d] = sort.split("-");
        const s = d === "asc" ? 1 : -1;
        return out.sort((a, b) =>
            k === "capacity" ? s * ((a.capacity ?? 0) - (b.capacity ?? 0)) : k === "created" ? s * (toTime(a.createdAt) - toTime(b.createdAt)) : s * a.name.localeCompare(b.name, "th"),
        );
    }, [rooms, search, faculty, facility, image, sort]);
    const { rows, totalPages, page: cur } = usePaged(filtered, page, perPage);

    const clear = () => {
        setSearch("");
        setFaculty("");
        setFacility("");
        setImage("");
    };

    const confirmDelete = async () => {
        if (!toDelete) return;
        setDeleting(true);
        const ids = toDelete === "bulk" ? [...sel.ids] : [toDelete._id];
        try {
            // ลบในคำขอเดียว (รวมรูปบน R2) แทนการยิงทีละรายการ
            const r = await batchDelete("prayer-rooms", ids);
            if (r.notFound.length) toastUtils.warning("ลบแล้วบางส่วน", `ลบ ${r.deleted.length} รายการ · ไม่พบ ${r.notFound.length} รายการ (อาจถูกลบไปก่อนแล้ว)`);
            else toastUtils.success("ย้ายไปถังขยะแล้ว", `ห้องละหมาด ${r.deleted.length} รายการ · กู้คืนได้ที่เมนูถังขยะภายใน 30 วัน`);
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
            <PageHeader title="ห้องละหมาด" description="ข้อมูลห้องละหมาดในมหาวิทยาลัยพร้อมแผนที่" art="prayer-room" action={{ label: "เพิ่มห้องละหมาด", href: "/admin/prayer-rooms/create" }} />

            <ListToolbar
                search={search}
                onSearch={setSearch}
                placeholder="ค้นหาชื่อ, สถานที่, คณะ, สิ่งอำนวยความสะดวก…"
                activeFilters={[faculty, facility, image].filter(Boolean).length}
                onClear={clear}
                filters={
                    <>
                        <ToolbarSelect label="คณะ/หน่วยงาน" value={faculty} onChange={setFaculty} allLabel="ทุกคณะ" options={faculties} icon={<Building className="size-4" />} />
                        <ToolbarSelect label="สิ่งอำนวยความสะดวก" value={facility} onChange={setFacility} allLabel="สิ่งอำนวยความสะดวก" options={facilities} icon={<Sparkles className="size-4" />} />
                        <ToolbarSelect label="รูปภาพ" value={image} onChange={setImage} allLabel="รูปทั้งหมด" icon={<ImageIcon className="size-4" />} options={[{ value: "with", label: "มีรูป" }, { value: "without", label: "ไม่มีรูป" }]} />
                    </>
                }
                sort={{ value: sort, onChange: setSort, options: SORTS }}
                summary={!loading && !error && `พบ ${filtered.length.toLocaleString()} จาก ${rooms.length.toLocaleString()} ห้อง`}
            />

            {error ? (
                <Section>
                    <EmptyState art="prayer-room" title="โหลดข้อมูลไม่สำเร็จ" description={error} action={<button type="button" className="btn-primary" onClick={load}>ลองใหม่</button>} />
                </Section>
            ) : loading ? (
                <CardGridSkeleton />
            ) : filtered.length === 0 ? (
                <Section>
                    <EmptyState
                        art="prayer-room"
                        title={rooms.length ? "ไม่พบห้องที่ตรงกับตัวกรอง" : "ยังไม่มีห้องละหมาด"}
                        description={rooms.length ? "ลองเปลี่ยนคำค้นหรือล้างตัวกรอง" : "เพิ่มห้องละหมาดแรกพร้อมตำแหน่งบนแผนที่"}
                        action={rooms.length ? <button type="button" className="btn-secondary" onClick={clear}>ล้างตัวกรอง</button> : undefined}
                    />
                </Section>
            ) : (
                <>
                    <div className={CARD_GRID}>
                        {rows.map((r) => (
                            <ContentCard
                                key={r._id}
                                image={r.images?.[0]}
                                title={r.name}
                                subtitle={
                                    <span className="flex items-center gap-1">
                                        <MapPin className="size-3 shrink-0" /> <span className="truncate">{[r.place, r.faculty].filter(Boolean).join(" · ") || "—"}</span>
                                    </span>
                                }
                                meta={
                                    <span className="flex items-center gap-2">
                                        {r.openingHours && (
                                            <span className="flex min-w-0 items-center gap-1 truncate">
                                                <Clock className="size-3 shrink-0" /> {r.openingHours}
                                            </span>
                                        )}
                                    </span>
                                }
                                badges={
                                    r.capacity ? (
                                        <Badge className="bg-surface/90 shadow-sm">
                                            <Users className="size-3" /> {r.capacity}
                                        </Badge>
                                    ) : undefined
                                }
                                art="prayer-room"
                                editHref={`/admin/prayer-rooms/edit/${r._id}`}
                                onDelete={() => setToDelete(r)}
                                selected={sel.has(r._id)}
                                onSelect={() => sel.toggle(r._id)}
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
                title={toDelete === "bulk" ? `ลบห้องละหมาด ${sel.size} รายการ?` : "ลบห้องละหมาดนี้?"}
                description="รูปภาพของห้องจะถูกลบไปด้วย"
                itemName={toDelete && toDelete !== "bulk" ? toDelete.name : undefined}
            />
        </div>
    );
}
