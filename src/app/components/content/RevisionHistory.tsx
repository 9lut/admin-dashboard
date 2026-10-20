"use client";

import { useCallback, useEffect, useState } from "react";
import { History, Loader2, RotateCcw } from "lucide-react";
import api from "@/lib/axios";
import { unwrapResponse, type ApiEnvelope } from "@/lib/axios/types";
import { Badge, Modal, Section } from "@/app/components/ui/kit";
import { Skeleton } from "@/app/components/ui/skeleton";
import { FIELD_LABEL, type ContentType } from "@/lib/content/types";
import { handleApiError } from "@/lib/axios";
import { toastUtils } from "@/lib/toast";

type Revision = { id: string; changed: string[]; by: string; byName: string; at: string; note: string | null; before: Record<string, unknown> };

const ago = (iso: string) => {
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return "เมื่อสักครู่";
    if (m < 60) return `${m} นาทีที่แล้ว`;
    if (m < 1440) return `${Math.round(m / 60)} ชั่วโมงที่แล้ว`;
    return new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
};

/** แสดงค่าเก่าแบบอ่านง่าย */
function show(v: unknown): string {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "string") return /^\d{4}-\d{2}-\d{2}T/.test(v) ? new Date(v).toLocaleString("th-TH") : v;
    if (Array.isArray(v)) return v.length ? v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ") : "—";
    if (typeof v === "boolean") return v ? "ใช่" : "ไม่ใช่";
    return JSON.stringify(v);
}

/** ประวัติการแก้ไขของเนื้อหา — ดูว่าใครแก้อะไรเมื่อไร และย้อนกลับได้ */
export function RevisionHistory({ type, id }: { type: ContentType; id: string }) {
    const [rows, setRows] = useState<Revision[] | null>(null);
    const [error, setError] = useState("");
    const [view, setView] = useState<Revision | null>(null);
    const [restoring, setRestoring] = useState<Revision | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setError("");
        try {
            setRows(unwrapResponse(await api.get<ApiEnvelope<Revision[]>>(`/content/revisions?type=${type}&id=${encodeURIComponent(id)}`)));
        } catch (e) {
            setError(handleApiError(e));
        }
    }, [type, id]);

    useEffect(() => {
        void load();
    }, [load]);

    const restore = async () => {
        if (!restoring) return;
        setBusy(true);
        try {
            await api.post("/content/revisions", { revisionId: restoring.id });
            toastUtils.success("ย้อนกลับแล้ว", "เวอร์ชันก่อนหน้าถูกเก็บไว้ในประวัติด้วย");
            window.location.reload();
        } catch (e) {
            toastUtils.error("ย้อนกลับไม่สำเร็จ", handleApiError(e));
            setBusy(false);
        }
    };

    return (
        <Section title={<span className="flex items-center gap-2"><History className="size-4 text-primary" /> ประวัติการแก้ไข</span>} description="เก็บย้อนหลัง 20 ครั้งล่าสุด" bodyClassName="p-3">
            {error ? (
                <p className="p-3 text-sm text-negative">{error}</p>
            ) : !rows ? (
                <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
            ) : rows.length === 0 ? (
                <p className="p-3 text-center text-sm text-muted">ยังไม่มีการแก้ไข</p>
            ) : (
                <ol className="relative space-y-1 before:absolute before:top-3 before:bottom-3 before:left-[15px] before:w-px before:bg-line">
                    {rows.map((r) => (
                        <li key={r.id} className="relative flex gap-3 rounded-2xl p-2 hover:bg-surface-2">
                            <span className="relative z-10 mt-1 grid size-[14px] shrink-0 place-items-center rounded-full border-2 border-primary bg-surface" style={{ marginLeft: 8 }} />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-fg">{r.byName}</p>
                                <p className="text-xs text-muted">{ago(r.at)}{r.note ? ` · ${r.note}` : ""}</p>
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                    {r.changed.slice(0, 5).map((f) => <Badge key={f}>{FIELD_LABEL[f] ?? f}</Badge>)}
                                    {r.changed.length > 5 && <Badge>+{r.changed.length - 5}</Badge>}
                                </div>
                                <div className="mt-2 flex gap-1">
                                    <button type="button" className="btn-ghost btn-sm" onClick={() => setView(r)}>ดูค่าก่อนแก้</button>
                                    <button type="button" className="btn-sm btn text-primary hover:bg-primary-soft" onClick={() => setRestoring(r)}>
                                        <RotateCcw className="size-3.5" /> ย้อนกลับ
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>
            )}

            <Modal open={!!view} onClose={() => setView(null)} size="md" title="ค่าก่อนการแก้ไขครั้งนี้" description={view ? `${view.byName} · ${ago(view.at)}` : undefined}>
                <dl className="divide-y divide-line rounded-2xl border border-line">
                    {view?.changed.map((f) => (
                        <div key={f} className="grid gap-1 p-3 sm:grid-cols-[140px_1fr]">
                            <dt className="text-xs font-bold text-muted">{FIELD_LABEL[f] ?? f}</dt>
                            <dd className="text-sm break-words whitespace-pre-wrap text-fg">{show(view.before[f]).slice(0, 1500)}</dd>
                        </div>
                    ))}
                </dl>
            </Modal>

            <Modal
                open={!!restoring}
                onClose={() => !busy && setRestoring(null)}
                title="ย้อนกลับไปเวอร์ชันนี้?"
                description="เนื้อหาจะกลับไปเป็นค่าก่อนการแก้ไขครั้งนั้น — เวอร์ชันปัจจุบันจะถูกเก็บในประวัติ จึงย้อนกลับมาได้อีก"
                footer={
                    <>
                        <button type="button" className="btn-secondary" onClick={() => setRestoring(null)} disabled={busy}>ยกเลิก</button>
                        <button type="button" className="btn-primary" onClick={restore} disabled={busy}>
                            {busy ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />} ย้อนกลับ
                        </button>
                    </>
                }
            />
        </Section>
    );
}
