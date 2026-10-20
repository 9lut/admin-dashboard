"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, Search } from "lucide-react";
import api from "@/lib/axios";
import { unwrapResponse, type ApiEnvelope } from "@/lib/axios/types";
import { Modal, Segmented } from "@/app/components/ui/kit";
import { Skeleton } from "@/app/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type MediaItem = {
    key: string;
    url: string;
    size: number;
    uploadedAt: string;
    status: "used" | "history" | "unused";
    usage: { kind: string; type?: string; id: string; title?: string; href?: string }[];
};

export async function fetchMedia(refresh = false): Promise<MediaItem[]> {
    return unwrapResponse(await api.get<ApiEnvelope<MediaItem[]>>(`/media${refresh ? "?refresh=1" : ""}`));
}

/** เลือกรูปจากคลังกลาง (ใช้รูปเดิมซ้ำโดยไม่ต้องอัปโหลดใหม่) */
export function MediaPicker({ open, onClose, onPick, max, exclude = [] }: { open: boolean; onClose: () => void; onPick: (urls: string[]) => void; max: number; exclude?: string[] }) {
    const [items, setItems] = useState<MediaItem[] | null>(null);
    const [error, setError] = useState("");
    const [picked, setPicked] = useState<string[]>([]);
    const [filter, setFilter] = useState<"all" | "used" | "unused">("all");
    const [q, setQ] = useState("");

    useEffect(() => {
        if (!open) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- เริ่มใหม่ทุกครั้งที่เปิด
        setPicked([]);
        fetchMedia()
            .then(setItems)
            .catch(() => setError("โหลดคลังรูปไม่สำเร็จ"));
    }, [open]);

    const shown = useMemo(() => {
        const s = q.trim().toLowerCase();
        return (items ?? [])
            .filter((i) => !exclude.includes(i.url))
            .filter((i) => filter === "all" || (filter === "used" ? i.status === "used" : i.status !== "used"))
            .filter((i) => !s || i.usage.some((u) => (u.title ?? "").toLowerCase().includes(s)));
    }, [items, filter, q, exclude]);

    const toggle = (url: string) => setPicked((p) => (p.includes(url) ? p.filter((x) => x !== url) : p.length < max ? [...p, url] : p));

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="lg"
            title="เลือกรูปจากคลัง"
            description={`เลือกได้อีก ${Math.max(max - picked.length, 0)} รูป`}
            footer={
                <>
                    <button type="button" className="btn-secondary" onClick={onClose}>ยกเลิก</button>
                    <button
                        type="button"
                        className="btn-primary"
                        disabled={!picked.length}
                        onClick={() => {
                            onPick(picked);
                            onClose();
                        }}
                    >
                        ใช้รูปที่เลือก ({picked.length})
                    </button>
                </>
            }
        >
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                    <input className="input h-10 pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นจากชื่อเนื้อหาที่ใช้รูป…" />
                </div>
                <Segmented label="กรองรูป" value={filter} onChange={setFilter} options={[{ id: "all", label: "ทั้งหมด" }, { id: "used", label: "ใช้อยู่" }, { id: "unused", label: "ยังไม่ใช้" }]} />
            </div>
            {error ? (
                <p className="py-10 text-center text-sm text-negative">{error}</p>
            ) : !items ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
                </div>
            ) : shown.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted">ไม่มีรูปในคลังที่ตรงกับตัวกรอง</p>
            ) : (
                <div className="grid max-h-[55dvh] grid-cols-3 gap-2 overflow-y-auto p-0.5 custom-scrollbar sm:grid-cols-5">
                    {shown.map((i) => {
                        const n = picked.indexOf(i.url);
                        return (
                            <button
                                key={i.key}
                                type="button"
                                onClick={() => toggle(i.url)}
                                title={i.usage[0]?.title ?? "ยังไม่ได้ใช้"}
                                className={cn("relative aspect-square overflow-hidden rounded-xl border-2 transition-all", n >= 0 ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-line-strong")}
                            >
                                <Image src={i.url} alt="" fill sizes="140px" className="object-cover" />
                                {n >= 0 && (
                                    <span className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-fg shadow">
                                        {n + 1}
                                    </span>
                                )}
                                {n < 0 && i.status !== "used" && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/55 px-1.5 text-[10px] text-white">ยังไม่ใช้</span>}
                                {n >= 0 && <Check className="sr-only" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </Modal>
    );
}
