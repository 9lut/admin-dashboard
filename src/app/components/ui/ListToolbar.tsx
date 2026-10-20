"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpDown, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * แถบค้นหา + ตัวกรอง + เรียงลำดับ แบบเดียวกันทุกหน้า
 * - มือถือ: ช่องค้นหาเต็มแถว + ปุ่ม "ตัวกรอง" เปิด/ปิดแผงตัวกรอง (ไม่เบียดจอ)
 * - จอใหญ่: ทุกอย่างอยู่แถวเดียว
 */
export function ListToolbar({
    search,
    onSearch,
    placeholder = "ค้นหา…",
    filters,
    sort,
    activeFilters = 0,
    onClear,
    summary,
    right,
    className,
}: {
    search: string;
    onSearch: (v: string) => void;
    placeholder?: string;
    filters?: ReactNode;
    sort?: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] };
    /** จำนวนตัวกรองที่ใช้งานอยู่ (ไม่รวมคำค้น) */
    activeFilters?: number;
    onClear?: () => void;
    /** ข้อความสรุปผล เช่น "พบ 12 จาก 40 รายการ" */
    summary?: ReactNode;
    /** ส่วนขวาสุด เช่น การแบ่งหน้า */
    right?: ReactNode;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    // คำค้นพิมพ์ลื่น: เก็บค่าในช่องเอง แล้วส่งออกหลังหยุดพิมพ์ 250ms
    const [text, setText] = useState(search);
    useEffect(() => setText(search), [search]);
    useEffect(() => {
        if (text === search) return;
        const t = setTimeout(() => onSearch(text), 250);
        return () => clearTimeout(t);
    }, [text, search, onSearch]);

    const hasAny = activeFilters > 0 || !!search;

    return (
        <div className={cn("rounded-2xl border border-line bg-surface p-3 shadow-card", className)}>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="flex gap-2 lg:flex-1">
                    <div className="relative min-w-0 flex-1 lg:max-w-sm">
                        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                        <input
                            type="search"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={placeholder}
                            aria-label={placeholder}
                            className="input h-10 pr-9 pl-10 [&::-webkit-search-cancel-button]:hidden"
                        />
                        {text && (
                            <button
                                type="button"
                                aria-label="ล้างคำค้นหา"
                                onClick={() => {
                                    setText("");
                                    onSearch("");
                                }}
                                className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
                            >
                                <X className="size-3.5" />
                            </button>
                        )}
                    </div>
                    {(filters || sort) && (
                        <button
                            type="button"
                            onClick={() => setOpen((o) => !o)}
                            aria-expanded={open}
                            className={cn("btn-secondary relative h-10 shrink-0 px-3 lg:hidden", open && "border-primary text-primary")}
                        >
                            <SlidersHorizontal className="size-4" />
                            <span className="hidden min-[400px]:inline">ตัวกรอง</span>
                            {activeFilters > 0 && (
                                <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-fg">{activeFilters}</span>
                            )}
                        </button>
                    )}
                </div>

                {(filters || sort) && (
                    <div className={cn("grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center lg:flex lg:flex-nowrap", open ? "" : "hidden lg:flex")}>
                        {filters}
                        {sort && (
                            <label className="col-span-2 flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-surface px-3 sm:col-span-1">
                                <ArrowUpDown className="size-4 shrink-0 text-muted" />
                                <select
                                    value={sort.value}
                                    onChange={(e) => sort.onChange(e.target.value)}
                                    aria-label="เรียงลำดับ"
                                    className="min-w-0 flex-1 cursor-pointer bg-transparent text-sm text-fg outline-none"
                                >
                                    {sort.options.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </label>
                        )}
                        {hasAny && onClear && (
                            <button type="button" onClick={onClear} className="btn-ghost btn-sm col-span-2 h-10 text-negative hover:bg-negative-soft hover:text-negative sm:col-span-1">
                                <X className="size-3.5" /> ล้างตัวกรอง
                            </button>
                        )}
                    </div>
                )}

                {right && <div className="lg:ml-auto">{right}</div>}
            </div>
            {summary && <div className="mt-2 px-1 text-xs text-muted">{summary}</div>}
        </div>
    );
}

/** select สำหรับใช้ใน ListToolbar */
export function ToolbarSelect({
    value,
    onChange,
    options,
    label,
    icon,
    allLabel,
}: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    label: string;
    icon?: ReactNode;
    /** ตัวเลือก "ทั้งหมด" (ค่า "") — ไม่ใส่ถ้าไม่ต้องการ */
    allLabel?: string;
}) {
    return (
        <label className={cn("flex h-10 min-w-0 items-center gap-2 rounded-xl border bg-surface px-3 transition-colors", value ? "border-primary/50 bg-primary-soft/40" : "border-line-strong")}>
            {icon && <span className="shrink-0 text-muted">{icon}</span>}
            <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="min-w-0 flex-1 cursor-pointer bg-transparent text-sm text-fg outline-none lg:min-w-[110px]">
                {allLabel !== undefined && <option value="">{allLabel}</option>}
                {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        </label>
    );
}
