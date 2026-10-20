"use client";

import { CalendarClock, Eye, FilePen } from "lucide-react";
import { Section } from "@/app/components/ui/kit";
import { cn } from "@/lib/utils";

export type PublishValue = { state: "published" | "scheduled" | "draft"; at: string };

const OPTIONS = [
    { id: "published", label: "เผยแพร่ทันที", hint: "แสดงบนเว็บไซต์ตั้งแต่บันทึก", icon: Eye },
    { id: "scheduled", label: "ตั้งเวลาเผยแพร่", hint: "ขึ้นเว็บเองเมื่อถึงเวลาที่กำหนด", icon: CalendarClock },
    { id: "draft", label: "บันทึกเป็นร่าง", hint: "เก็บไว้ก่อน ยังไม่แสดงบนเว็บ", icon: FilePen },
] as const;

/** ค่าเริ่มต้นจากเอกสาร (status / publishAt) */
export function publishFromDoc(doc: { status?: string | null; publishAt?: string | null } | null | undefined, toLocal: (iso?: string | null) => string): PublishValue {
    if (!doc) return { state: "published", at: "" };
    if (doc.status === "draft") return { state: "draft", at: "" };
    if (doc.publishAt && new Date(doc.publishAt).getTime() > Date.now()) return { state: "scheduled", at: toLocal(doc.publishAt) };
    return { state: "published", at: "" };
}

export function publishError(v: PublishValue): string {
    if (v.state !== "scheduled") return "";
    if (!v.at) return "กรุณาเลือกเวลาเผยแพร่";
    if (new Date(v.at).getTime() <= Date.now()) return "เวลาเผยแพร่ต้องอยู่ในอนาคต";
    return "";
}

/** การ์ดเลือกสถานะเผยแพร่ (ร่าง / ตั้งเวลา / ทันที) */
export function PublishControl({ value, onChange, error }: { value: PublishValue; onChange: (v: PublishValue) => void; error?: string }) {
    return (
        <Section title="การเผยแพร่" bodyClassName="space-y-2 p-4">
            {OPTIONS.map((o) => {
                const on = value.state === o.id;
                return (
                    <label key={o.id} className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors", on ? "border-primary bg-primary-soft/50" : "border-line hover:bg-surface-2")}>
                        <input type="radio" name="publish" className="sr-only" checked={on} onChange={() => onChange({ ...value, state: o.id })} />
                        <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", on ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted")}>
                            <o.icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className={cn("block text-sm font-bold", on ? "text-primary" : "text-fg")}>{o.label}</span>
                            <span className="block text-xs text-muted">{o.hint}</span>
                        </span>
                    </label>
                );
            })}
            {value.state === "scheduled" && (
                <div className="pt-1">
                    <input type="datetime-local" className="field" value={value.at} onChange={(e) => onChange({ ...value, at: e.target.value })} aria-label="เวลาเผยแพร่" />
                    {error ? <p className="mt-1.5 text-xs text-negative">{error}</p> : value.at && <p className="mt-1.5 text-xs text-muted">จะขึ้นเว็บ {new Date(value.at).toLocaleString("th-TH", { dateStyle: "long", timeStyle: "short" })}</p>}
                </div>
            )}
        </Section>
    );
}

/** ใส่ค่าการเผยแพร่ลงใน FormData/obj ที่ส่ง API */
export function publishPayload(v: PublishValue): Record<string, string> {
    return { publish_state: v.state, publish_at: v.state === "scheduled" && v.at ? new Date(v.at).toISOString() : "" };
}
