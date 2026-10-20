"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Illustration } from "@/app/components/brand/Illustration";
import { Skeleton } from "@/app/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** สถานะการเลือกหลายรายการ */
export function useSelection() {
    const [ids, setIds] = useState<Set<string>>(new Set());
    const toggle = useCallback((id: string) => setIds((s) => {
        const n = new Set(s);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
    }), []);
    const setMany = useCallback((list: string[], on: boolean) => setIds((s) => {
        const n = new Set(s);
        for (const id of list) {
            if (on) n.add(id);
            else n.delete(id);
        }
        return n;
    }), []);
    const clear = useCallback(() => setIds(new Set()), []);
    return { ids, toggle, setMany, clear, size: ids.size, has: (id: string) => ids.has(id) };
}

/** แถบการกระทำกับรายการที่เลือก — ลอยด้านล่าง (มือถืออยู่เหนือเมนูล่าง) */
export function BulkBar({ count, pageIds, selection, onDelete }: { count: number; pageIds: string[]; selection: ReturnType<typeof useSelection>; onDelete: () => void }) {
    const allOnPage = pageIds.length > 0 && pageIds.every((id) => selection.has(id));
    if (count === 0) return null;
    return (
        <div className="fixed inset-x-3 bottom-24 z-30 mx-auto flex max-w-xl items-center gap-2 rounded-2xl border border-line bg-surface p-2 pl-4 shadow-pop lg:bottom-6 lg:left-[300px]">
            <span className="text-sm font-bold text-fg">เลือก {count} รายการ</span>
            <button type="button" className="btn-ghost btn-sm ml-auto" onClick={() => selection.setMany(pageIds, !allOnPage)}>
                {allOnPage ? "ไม่เลือกหน้านี้" : "เลือกทั้งหน้า"}
            </button>
            <button type="button" className="btn-sm btn bg-negative text-white hover:opacity-90" onClick={onDelete}>
                <Trash2 className="size-3.5" /> ลบ
            </button>
            <button type="button" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2" onClick={selection.clear} aria-label="ยกเลิกการเลือก">
                <X className="size-4" />
            </button>
        </div>
    );
}

/** การ์ดเนื้อหา (ข่าว/กิจกรรม/บทความ/ห้องละหมาด) ขนาดเท่ากันทุกใบ */
export function ContentCard({
    image,
    title,
    subtitle,
    meta,
    badges,
    editHref,
    onDelete,
    selected,
    onSelect,
    art = "empty",
}: {
    image?: string | null;
    title: string;
    subtitle?: ReactNode;
    meta?: ReactNode;
    badges?: ReactNode;
    editHref: string;
    onDelete?: () => void;
    selected?: boolean;
    onSelect?: () => void;
    art?: string;
}) {
    return (
        <article
            className={cn(
                "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-surface shadow-card transition-all hover:-translate-y-0.5 hover:shadow-pop",
                selected ? "border-primary ring-2 ring-primary/25" : "border-line",
            )}
        >
            <Link href={editHref} prefetch={false} className="relative block aspect-[16/10] overflow-hidden bg-primary-soft" aria-label={`แก้ไข ${title}`}>
                {image ? (
                    <Image src={image} alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 20vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                    <span className="grid h-full place-items-center">
                        <Illustration name={art} className="size-16 opacity-80" />
                    </span>
                )}
                {badges && <span className="absolute right-2 bottom-2 flex flex-wrap justify-end gap-1">{badges}</span>}
            </Link>
            {onSelect && (
                <button
                    type="button"
                    onClick={onSelect}
                    aria-pressed={selected}
                    aria-label={selected ? "ยกเลิกเลือก" : "เลือก"}
                    className={cn(
                        "absolute top-2 left-2 z-10 grid size-6 place-items-center rounded-md border-2 shadow-sm transition-all sm:size-7 sm:rounded-lg",
                        selected ? "border-primary bg-primary text-primary-fg" : "border-white bg-white/40 text-transparent backdrop-blur-sm hover:bg-black/30 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100",
                    )}
                >
                    <Check className="size-4" strokeWidth={3} />
                </button>
            )}
            <div className="flex flex-1 flex-col p-3 sm:p-3.5">
                <h3 className="line-clamp-2 text-sm leading-snug font-bold text-fg">
                    <Link href={editHref} prefetch={false} className="hover:text-primary">{title}</Link>
                </h3>
                {subtitle && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{subtitle}</p>}
                <div className="mt-auto flex items-center gap-1 pt-3">
                    <div className="min-w-0 flex-1 truncate text-[11px] text-muted">{meta}</div>
                    <Link href={editHref} prefetch={false} className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-primary-soft hover:text-primary" aria-label="แก้ไข" title="แก้ไข">
                        <Pencil className="size-3.5" />
                    </Link>
                    {onDelete && (
                        <button type="button" onClick={onDelete} className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-negative-soft hover:text-negative" aria-label="ลบ" title="ลบ">
                            <Trash2 className="size-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}

export const CARD_GRID = "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";

export function CardGridSkeleton({ count = 10 }: { count?: number }) {
    return (
        <div className={CARD_GRID} aria-busy="true" aria-label="กำลังโหลด">
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-line bg-surface">
                    <Skeleton className="aspect-[16/10] w-full rounded-none" />
                    <div className="space-y-2 p-3.5">
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                        <Skeleton className="mt-3 h-3 w-1/3" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function TableSkeletonRows({ rows = 8 }: { rows?: number }) {
    return (
        <div className="space-y-2" aria-busy="true" aria-label="กำลังโหลด">
            {Array.from({ length: rows }, (_, i) => (
                <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
        </div>
    );
}

/** ใช้คำนวณหน้าปัจจุบันของรายการที่กรองแล้ว */
export function usePaged<T>(items: T[], page: number, perPage: number) {
    return useMemo(() => {
        const totalPages = Math.max(1, Math.ceil(items.length / perPage));
        const safe = Math.min(page, totalPages);
        return { totalPages, page: safe, rows: items.slice((safe - 1) * perPage, safe * perPage) };
    }, [items, page, perPage]);
}
