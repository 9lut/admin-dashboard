"use client";

import { useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { permissionService } from "@/services/permissionService";
import { invalidateMenuAccess } from "@/hooks/useMenuAccess";
import type { DepartmentMap } from "@/lib/access/menus";
import { handleApiError } from "@/lib/axios";
import { toastUtils } from "@/lib/toast";
import { cn } from "@/lib/utils";

/**
 * เลือกฝ่ายแบบชิป + สร้างฝ่ายใหม่ได้ทันที (ไม่ต้องไปหน้าสิทธิ์)
 * ฝ่ายใหม่ยังไม่มีสิทธิ์เมนู — มีลิงก์ไปตั้งสิทธิ์ต่อ
 */
export function DepartmentPicker({
    map,
    value,
    onChange,
    onMapChange,
    disabled,
}: {
    map: DepartmentMap;
    value: string[];
    onChange: (v: string[]) => void;
    onMapChange: (m: DepartmentMap) => void;
    disabled?: boolean;
}) {
    const [adding, setAdding] = useState(false);
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);
    const names = Object.keys(map).sort((a, b) => a.localeCompare(b, "th"));

    const create = async () => {
        const n = name.trim().replace(/\s+/g, " ");
        if (!n) return;
        if (n in map) {
            onChange([...new Set([...value, n])]);
            setName("");
            setAdding(false);
            return;
        }
        setBusy(true);
        try {
            const saved = await permissionService.updateSettings({ departments: { ...map, [n]: [] } });
            onMapChange(saved.departments);
            onChange([...value, n]);
            invalidateMenuAccess();
            toastUtils.success("สร้างฝ่ายแล้ว", `อย่าลืมกำหนดเมนูของ “${n}” ที่หน้าสิทธิ์การเข้าถึง`);
            setName("");
            setAdding(false);
        } catch (e) {
            toastUtils.error("สร้างฝ่ายไม่สำเร็จ", handleApiError(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={cn("flex flex-wrap gap-2", disabled && "pointer-events-none opacity-40")}>
            {names.map((d) => {
                const on = value.includes(d);
                return (
                    <button
                        key={d}
                        type="button"
                        aria-pressed={on}
                        onClick={() => onChange(on ? value.filter((x) => x !== d) : [...value, d])}
                        className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors", on ? "border-primary bg-primary text-primary-fg" : "border-line-strong text-fg-2 hover:border-primary")}
                        title={`${map[d].length} เมนู`}
                    >
                        {on && <Check className="size-3.5" />} {d}
                        <span className={cn("text-[10px]", on ? "text-white/75" : "text-muted")}>{map[d].length}</span>
                    </button>
                );
            })}
            {adding ? (
                <span className="flex items-center gap-1">
                    <input
                        autoFocus
                        value={name}
                        maxLength={50}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                void create();
                            }
                            if (e.key === "Escape") setAdding(false);
                        }}
                        placeholder="ชื่อฝ่ายใหม่"
                        className="field h-9 w-40 py-1.5"
                    />
                    <button type="button" onClick={create} disabled={busy || !name.trim()} className="btn-primary btn-sm h-9">
                        {busy ? <Loader2 className="size-3.5 animate-spin" /> : "เพิ่ม"}
                    </button>
                </span>
            ) : (
                <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-line-strong px-3 py-1.5 text-sm text-primary hover:bg-primary-soft">
                    <Plus className="size-3.5" /> ฝ่ายใหม่
                </button>
            )}
        </div>
    );
}
