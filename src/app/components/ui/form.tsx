"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { AlertCircle, GripVertical, ImagePlus, Images, Link2, Loader2, Plus, Star, Trash2, X } from "lucide-react";
import api, { handleApiError } from "@/lib/axios";
import { unwrapResponse, type ApiEnvelope } from "@/lib/axios/types";
import { MediaPicker } from "@/app/components/content/MediaPicker";
import { toastUtils } from "@/lib/toast";
import { cn } from "@/lib/utils";

/** ช่องฟอร์ม: ป้าย + ช่องกรอก + ข้อความช่วย/ข้อผิดพลาด */
export function FormField({ label, required, error, hint, children, className }: { label: string; required?: boolean; error?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <div className={className}>
            <span className="label">
                {label} {required && <span className="text-negative">*</span>}
            </span>
            {children}
            {error ? (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-negative" role="alert">
                    <AlertCircle className="size-3.5 shrink-0" /> {error}
                </p>
            ) : (
                hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  วันเวลา: input datetime-local ใช้เวลา "ท้องถิ่น" ไม่ใช่ UTC            */
/* ------------------------------------------------------------------ */

/** ISO → "YYYY-MM-DDTHH:mm" ตามเวลาเครื่อง (เดิมใช้ toISOString ทำให้เวลาคลาด 7 ชม.) */
export function toLocalInput(iso?: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** "YYYY-MM-DDTHH:mm" (เวลาเครื่อง) → ISO UTC สำหรับส่ง API */
export function fromLocalInput(v: string): string {
    return v ? new Date(v).toISOString() : "";
}

/* ------------------------------------------------------------------ */
/*  รายการข้อความหลายข้อ (วัตถุประสงค์/เป้าหมาย/สิ่งอำนวยความสะดวก)     */
/* ------------------------------------------------------------------ */
export function ListEditor({ value, onChange, placeholder, addLabel, max = 20 }: { value: string[]; onChange: (v: string[]) => void; placeholder: string; addLabel: string; max?: number }) {
    const refs = useRef<(HTMLInputElement | null)[]>([]);
    const focusAt = useRef<number | null>(null);
    useEffect(() => {
        if (focusAt.current !== null) {
            refs.current[focusAt.current]?.focus();
            focusAt.current = null;
        }
    });
    const set = (i: number, v: string) => onChange(value.map((x, j) => (j === i ? v : x)));
    const add = (at = value.length) => {
        if (value.length >= max) return;
        const next = [...value];
        next.splice(at, 0, "");
        focusAt.current = at;
        onChange(next);
    };
    const remove = (i: number) => onChange(value.filter((_, j) => j !== i));

    return (
        <div className="space-y-2">
            {value.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="tabular grid size-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-xs font-bold text-primary">{i + 1}</span>
                    <input
                        ref={(el) => {
                            refs.current[i] = el;
                        }}
                        className="field py-2"
                        value={item}
                        maxLength={300}
                        placeholder={placeholder}
                        onChange={(e) => set(i, e.target.value)}
                        onKeyDown={(e) => {
                            // Enter = เพิ่มข้อใหม่ต่อจากข้อนี้ · Backspace บนช่องว่าง = ลบข้อ
                            if (e.key === "Enter") {
                                e.preventDefault();
                                add(i + 1);
                            }
                            if (e.key === "Backspace" && !item && value.length > 1) {
                                e.preventDefault();
                                focusAt.current = Math.max(0, i - 1);
                                remove(i);
                            }
                        }}
                    />
                    <button type="button" onClick={() => remove(i)} className="grid size-9 shrink-0 place-items-center rounded-xl text-muted hover:bg-negative-soft hover:text-negative" aria-label={`ลบข้อ ${i + 1}`}>
                        <Trash2 className="size-4" />
                    </button>
                </div>
            ))}
            {value.length < max && (
                <button type="button" onClick={() => add()} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong py-2.5 text-xs font-bold text-primary transition-colors hover:bg-primary-soft">
                    <Plus className="size-3.5" /> {addLabel}
                </button>
            )}
            <p className="text-[11px] text-muted">กด Enter เพื่อเพิ่มข้อถัดไป</p>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  อัปโหลดรูป: ลากวาง/เลือกไฟล์ · พรีวิว · รูปแรก = รูปปก                */
/* ------------------------------------------------------------------ */
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ImageUploader({
    value,
    onChange,
    max = 10,
    maxMB = 5,
    reorderable = true,
    library = true,
}: {
    value: (string | File)[];
    onChange: (v: (string | File)[]) => void;
    max?: number;
    maxMB?: number;
    /** ย้ายรูปเป็นปกได้ (ปิดเมื่อ API ไม่รองรับการเรียงรูปเดิมใหม่) */
    reorderable?: boolean;
    /** แสดงปุ่ม "เลือกจากคลัง" (ใช้รูปเดิมซ้ำ) */
    library?: boolean;
}) {
    const [drag, setDrag] = useState(false);
    const [picker, setPicker] = useState(false);
    const [link, setLink] = useState("");
    const [importing, setImporting] = useState(false);

    /** วางลิงก์รูป (เช่นจาก Facebook) → server ดึงมาเก็บใน R2 ให้ (ลิงก์ Facebook หมดอายุ จึงต้องเก็บสำเนา) */
    const importLink = async () => {
        const url = link.trim();
        if (!url || importing) return;
        if (value.length >= max) {
            toastUtils.warning("เกินจำนวนที่กำหนด", `สูงสุด ${max} รูป`);
            return;
        }
        setImporting(true);
        try {
            const r = unwrapResponse(await api.post<ApiEnvelope<{ url: string }>>("/media/import", { url }));
            onChange([...value, r.url]);
            setLink("");
            toastUtils.success("เพิ่มรูปจากลิงก์แล้ว", "ระบบเก็บสำเนารูปไว้ให้ ลิงก์ต้นทางหมดอายุก็ไม่เสีย");
        } catch (e) {
            toastUtils.error("ดึงรูปจากลิงก์ไม่สำเร็จ", handleApiError(e));
        } finally {
            setImporting(false);
        }
    };
    const inputRef = useRef<HTMLInputElement>(null);

    // URL พรีวิวของไฟล์ใหม่ — สร้างครั้งเดียวต่อไฟล์ และคืนหน่วยความจำเมื่อเลิกใช้
    const previews = useMemo(() => new Map(value.filter((v): v is File => v instanceof File).map((f) => [f, URL.createObjectURL(f)])), [value]);
    useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

    const addFiles = (files: FileList | File[]) => {
        const list = Array.from(files);
        const ok: File[] = [];
        for (const f of list) {
            if (!TYPES.includes(f.type)) {
                toastUtils.error("ไฟล์ไม่รองรับ", `${f.name} — ใช้ได้เฉพาะ JPG, PNG, WEBP`);
                continue;
            }
            if (f.size > maxMB * 1024 * 1024) {
                toastUtils.error("ไฟล์ใหญ่เกินไป", `${f.name} — ไม่เกิน ${maxMB}MB ต่อรูป`);
                continue;
            }
            ok.push(f);
        }
        const room = max - value.length;
        if (ok.length > room) toastUtils.warning("เกินจำนวนที่กำหนด", `เพิ่มได้อีก ${Math.max(room, 0)} รูป (สูงสุด ${max} รูป)`);
        if (room > 0 && ok.length) onChange([...value, ...ok.slice(0, room)]);
    };

    const makeCover = (i: number) => {
        const next = [...value];
        const [it] = next.splice(i, 1);
        onChange([it, ...next]);
    };

    return (
        <div>
            <div
                onDragOver={(e) => {
                    e.preventDefault();
                    setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDrag(false);
                    addFiles(e.dataTransfer.files);
                }}
                className={cn("grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-2 rounded-2xl p-1 transition-colors", drag && "bg-primary-soft ring-2 ring-primary ring-dashed")}
            >
                {value.map((img, i) => {
                    const src = img instanceof File ? previews.get(img) : img;
                    return (
                        <div key={img instanceof File ? `${img.name}-${img.lastModified}-${i}` : img} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-2">
                            {src && <Image src={src} alt="" fill sizes="160px" className="object-cover" unoptimized={img instanceof File} />}
                            {i === 0 && (
                                <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-fg shadow">
                                    <Star className="size-3 fill-current" /> ปก
                                </span>
                            )}
                            {img instanceof File && <span className="absolute right-1.5 bottom-1.5 rounded-full bg-positive px-2 py-0.5 text-[10px] font-bold text-white shadow">ใหม่</span>}
                            <div className="absolute inset-x-1.5 top-1.5 flex justify-end gap-1">
                                {reorderable && i > 0 && (
                                    <button type="button" onClick={() => makeCover(i)} className="grid size-7 place-items-center rounded-full bg-white/90 text-fg-2 shadow hover:text-primary" aria-label="ตั้งเป็นรูปปก" title="ตั้งเป็นรูปปก">
                                        <GripVertical className="size-3.5" />
                                    </button>
                                )}
                                <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="grid size-7 place-items-center rounded-full bg-white/90 text-fg-2 shadow hover:bg-negative hover:text-white" aria-label="ลบรูป" title="ลบรูป">
                                    <X className="size-3.5" />
                                </button>
                            </div>
                        </div>
                    );
                })}
                {value.length < max && (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line-strong text-muted transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
                    >
                        <ImagePlus className="size-6" />
                        <span className="text-[11px] font-bold">อัปโหลด</span>
                    </button>
                )}
                {library && value.length < max && (
                    <button
                        type="button"
                        onClick={() => setPicker(true)}
                        className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line-strong text-muted transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
                    >
                        <Images className="size-6" />
                        <span className="text-[11px] font-bold">เลือกจากคลัง</span>
                    </button>
                )}
            </div>
            <input
                ref={inputRef}
                type="file"
                multiple
                accept={TYPES.join(",")}
                className="hidden"
                onChange={(e) => {
                    if (e.target.files) addFiles(e.target.files);
                    e.target.value = "";
                }}
            />
            {value.length < max && (
                <div className="mt-3 flex gap-2">
                    <div className="relative min-w-0 flex-1">
                        <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                        <input
                            type="url"
                            inputMode="url"
                            value={link}
                            disabled={importing}
                            onChange={(e) => setLink(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    void importLink();
                                }
                            }}
                            placeholder="วางลิงก์รูป เช่น จาก Facebook"
                            aria-label="ลิงก์รูปภาพ"
                            className="field py-2 pl-9"
                        />
                    </div>
                    <button type="button" onClick={importLink} disabled={!link.trim() || importing} className="btn-secondary shrink-0">
                        {importing ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} ดึงรูป
                    </button>
                </div>
            )}
            {library && (
                <MediaPicker
                    open={picker}
                    onClose={() => setPicker(false)}
                    max={max - value.length}
                    exclude={value.filter((v): v is string => typeof v === "string")}
                    onPick={(urls) => onChange([...value, ...urls])}
                />
            )}
            <p className="mt-2 text-[11px] text-muted">
                {value.length}/{max} รูป · อัปโหลด/ลากไฟล์ (JPG, PNG, WEBP ไม่เกิน {maxMB}MB) · เลือกจากคลัง · หรือวางลิงก์รูป · รูปแรกคือรูปปก
            </p>
        </div>
    );
}

/**
 * แยกรูปในฟอร์มเพื่อส่ง API:
 * files = อัปโหลดใหม่ · libraryUrls = เลือกจากคลัง (ยังไม่อยู่ในเนื้อหานี้) · removed = รูปเดิมที่เอาออก
 */
export function splitImages(images: (string | File)[], original: string[] = []) {
    const strings = images.filter((i): i is string => typeof i === "string");
    return {
        files: images.filter((i): i is File => i instanceof File),
        libraryUrls: strings.filter((u) => !original.includes(u)),
        removed: original.filter((u) => !strings.includes(u)),
    };
}
