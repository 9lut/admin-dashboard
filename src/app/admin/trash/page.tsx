"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, Loader2, RotateCcw, Trash2 } from "lucide-react";
import api from "@/lib/axios";
import { unwrapResponse, type ApiEnvelope } from "@/lib/axios/types";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { ListToolbar, ToolbarSelect } from "@/app/components/ui/ListToolbar";
import { Badge, EmptyState, Modal, Section } from "@/app/components/ui/kit";
import { TableSkeletonRows, useSelection } from "@/app/components/ui/list";
import { Illustration } from "@/app/components/brand/Illustration";
import { CONTENT, type ContentType } from "@/lib/content/types";
import { includesAll, toTime } from "@/lib/format";
import { handleApiError } from "@/lib/axios";
import { toastUtils } from "@/lib/toast";
import { cn } from "@/lib/utils";

type TrashItem = { id: string; type: ContentType; docId: string; title: string; image: string | null; by: string; byName: string; deletedAt: string; expiresAt: string; images: number };

const daysLeft = (iso: string) => Math.max(0, Math.ceil((toTime(iso) - Date.now()) / 86400000));

export default function TrashPage() {
    const [items, setItems] = useState<TrashItem[] | null>(null);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [type, setType] = useState("");
    const [confirm, setConfirm] = useState<{ action: "restore" | "purge"; ids: string[] } | null>(null);
    const [busy, setBusy] = useState(false);
    const sel = useSelection();

    const load = useCallback(async () => {
        setError("");
        try {
            setItems(unwrapResponse(await api.get<ApiEnvelope<TrashItem[]>>("/trash")));
        } catch (e) {
            setError(handleApiError(e));
        }
    }, []);
    useEffect(() => {
        void load();
    }, [load]);

    const types = useMemo(() => [...new Set((items ?? []).map((i) => i.type))].map((t) => ({ value: t, label: CONTENT[t]?.label ?? t })), [items]);
    const rows = useMemo(
        () => (items ?? []).filter((i) => (!type || i.type === type) && (!search || includesAll([i.title, i.byName, CONTENT[i.type]?.label], search))),
        [items, type, search],
    );
    const allOn = rows.length > 0 && rows.every((r) => sel.has(r.id));

    const run = async () => {
        if (!confirm) return;
        setBusy(true);
        try {
            const r = unwrapResponse(await api.post<ApiEnvelope<{ restored?: string[]; skipped?: { reason: string }[]; purged?: number; imagesDeleted?: number }>>("/trash", confirm));
            if (confirm.action === "restore") {
                toastUtils.success("กู้คืนแล้ว", `กู้คืน ${r.restored?.length ?? 0} รายการ${r.skipped?.length ? ` · ข้าม ${r.skipped.length} (${r.skipped[0].reason})` : ""}`);
            } else {
                toastUtils.success("ลบถาวรแล้ว", `ลบ ${r.purged ?? 0} รายการ · ลบรูปที่ไม่มีที่ใช้ ${r.imagesDeleted ?? 0} รูป`);
            }
            sel.clear();
            setConfirm(null);
            await load();
        } catch (e) {
            toastUtils.error("ทำรายการไม่สำเร็จ", handleApiError(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="w-full space-y-5">
            <PageHeader title="ถังขยะ" description="เนื้อหาที่ถูกลบจะอยู่ที่นี่ 30 วันก่อนถูกลบถาวรอัตโนมัติ — กู้คืนได้ทุกเมื่อ" art="trash">
                {sel.size > 0 && (
                    <>
                        <button type="button" className="btn-secondary" onClick={() => setConfirm({ action: "restore", ids: [...sel.ids] })}>
                            <RotateCcw className="size-4" /> กู้คืน ({sel.size})
                        </button>
                        <button type="button" className="btn-danger" onClick={() => setConfirm({ action: "purge", ids: [...sel.ids] })}>
                            <Trash2 className="size-4" /> ลบถาวร
                        </button>
                    </>
                )}
            </PageHeader>

            <ListToolbar
                search={search}
                onSearch={setSearch}
                placeholder="ค้นหาชื่อเนื้อหา หรือผู้ลบ…"
                activeFilters={type ? 1 : 0}
                onClear={() => {
                    setSearch("");
                    setType("");
                }}
                filters={<ToolbarSelect label="ประเภท" value={type} onChange={setType} allLabel="ทุกประเภท" options={types} />}
                summary={items && `${rows.length.toLocaleString()} รายการในถังขยะ`}
            />

            {error ? (
                <Section>
                    <EmptyState art="trash" title="โหลดถังขยะไม่สำเร็จ" description={error} action={<button type="button" className="btn-primary" onClick={load}>ลองใหม่</button>} />
                </Section>
            ) : !items ? (
                <TableSkeletonRows />
            ) : rows.length === 0 ? (
                <Section>
                    <EmptyState art="trash" title={items.length ? "ไม่พบรายการที่ตรงกับตัวกรอง" : "ถังขยะว่าง"} description={items.length ? undefined : "เนื้อหาที่ถูกลบจะมาอยู่ที่นี่ และกู้คืนได้ภายใน 30 วัน"} />
                </Section>
            ) : (
                <Section bodyClassName="divide-y divide-line">
                    <div className="flex items-center gap-3 bg-surface-2/60 px-4 py-2.5 text-xs font-bold text-muted">
                        <button type="button" onClick={() => sel.setMany(rows.map((r) => r.id), !allOn)} aria-label="เลือกทั้งหมด" className={cn("grid size-5 place-items-center rounded-md border-2", allOn ? "border-primary bg-primary text-primary-fg" : "border-line-strong")}>
                            {allOn && <Check className="size-3" strokeWidth={3} />}
                        </button>
                        เลือกทั้งหมด
                    </div>
                    {rows.map((r) => {
                        const on = sel.has(r.id);
                        const left = daysLeft(r.expiresAt);
                        return (
                            <div key={r.id} className={cn("flex items-center gap-3 px-3 py-3 sm:px-4", on && "bg-primary-soft/40")}>
                                <button type="button" onClick={() => sel.toggle(r.id)} aria-pressed={on} aria-label="เลือก" className={cn("grid size-5 shrink-0 place-items-center rounded-md border-2", on ? "border-primary bg-primary text-primary-fg" : "border-line-strong")}>
                                    {on && <Check className="size-3" strokeWidth={3} />}
                                </button>
                                <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary-soft">
                                    {r.image ? <Image src={r.image} alt="" fill sizes="56px" className="object-cover opacity-80 grayscale-[40%]" /> : <Illustration name={CONTENT[r.type]?.art ?? "empty"} className="size-9" />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold text-fg">{r.title}</p>
                                    <p className="mt-0.5 text-xs text-muted">
                                        ลบโดย {r.byName} · {new Date(r.deletedAt).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                        {r.images > 0 && ` · รูป ${r.images}`}
                                    </p>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        <Badge>{CONTENT[r.type]?.label ?? r.type}</Badge>
                                        <Badge tone={left <= 3 ? "red" : left <= 7 ? "amber" : "gray"}>ลบถาวรใน {left} วัน</Badge>
                                    </div>
                                </div>
                                <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                                    <button type="button" className="btn-secondary btn-sm" onClick={() => setConfirm({ action: "restore", ids: [r.id] })}>
                                        <RotateCcw className="size-3.5" /> <span className="hidden sm:inline">กู้คืน</span>
                                    </button>
                                    <button type="button" className="btn-danger btn-sm" onClick={() => setConfirm({ action: "purge", ids: [r.id] })} aria-label="ลบถาวร">
                                        <Trash2 className="size-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </Section>
            )}

            <Modal
                open={!!confirm}
                onClose={() => !busy && setConfirm(null)}
                title={confirm?.action === "restore" ? `กู้คืน ${confirm.ids.length} รายการ?` : `ลบถาวร ${confirm?.ids.length ?? 0} รายการ?`}
                description={confirm?.action === "restore" ? "เนื้อหาจะกลับไปอยู่ที่เดิมพร้อมรูปภาพ (สถานะเผยแพร่เหมือนก่อนลบ)" : "ลบออกจากระบบถาวร และลบรูปที่ไม่มีเนื้อหาอื่นใช้ ย้อนกลับไม่ได้"}
                footer={
                    <>
                        <button type="button" className="btn-secondary" onClick={() => setConfirm(null)} disabled={busy}>ยกเลิก</button>
                        <button type="button" className={confirm?.action === "restore" ? "btn-primary" : "btn bg-negative text-white hover:opacity-90"} onClick={run} disabled={busy}>
                            {busy ? <Loader2 className="size-4 animate-spin" /> : confirm?.action === "restore" ? <RotateCcw className="size-4" /> : <Trash2 className="size-4" />}
                            {confirm?.action === "restore" ? "กู้คืน" : "ลบถาวร"}
                        </button>
                    </>
                }
            />
        </div>
    );
}
