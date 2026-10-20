"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Database, HardDrive, Images, Loader2, PenLine, RefreshCw, Save, Sparkles, Trash2 } from "lucide-react";
import api, { handleApiError } from "@/lib/axios";
import { unwrapResponse, type ApiEnvelope } from "@/lib/axios/types";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Badge, EmptyState, Modal, Section, Switch } from "@/app/components/ui/kit";
import { Skeleton } from "@/app/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { LIMITS, usageLevel, type Level, type StoragePolicy } from "@/lib/storage/policy";
import { toastUtils } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Col = { key: string; label: string; group: "content" | "system" | "history"; count: number; bytes: number };
type Data = {
    policy: StoragePolicy;
    preview: { key: string; label: string; count: number }[];
    usage: {
        firestore: { collections: Col[]; bytes: number; docs: number };
        r2: { objects: number; bytes: number; ownObjects: number; ownBytes: number };
        today: { views: number; actions: number; writes: number };
        lastCleanup: { at: string | null; by: string; result: Record<string, number> } | null;
        measuredAt: string;
    };
};

const fmt = (b: number) => (b >= 1073741824 ? `${(b / 1073741824).toFixed(2)} GB` : b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const LEVEL: Record<Level, { bar: string; text: string; badge: "green" | "amber" | "red"; label: string }> = {
    ok: { bar: "bg-positive", text: "text-positive", badge: "green", label: "ปกติ" },
    warn: { bar: "bg-warning", text: "text-warning", badge: "amber", label: "ใกล้เต็ม" },
    danger: { bar: "bg-negative", text: "text-negative", badge: "red", label: "เกือบเต็ม" },
};
const GROUP = { content: "เนื้อหา", system: "ระบบ", history: "ประวัติ/ถังขยะ" } as const;

/** ช่องนโยบายในฟอร์ม */
const FIELDS: { key: keyof typeof LIMITS; label: string; unit: string; hint: string; group: "retention" | "quota" }[] = [
    { key: "logsDays", label: "เก็บบันทึกระบบ", unit: "วัน", hint: "บันทึกการเข้าสู่ระบบ/แก้ไขข้อมูล ที่เก่ากว่านี้จะถูกลบ", group: "retention" },
    { key: "revisionsMax", label: "ประวัติการแก้ไขต่อเนื้อหา", unit: "เวอร์ชัน", hint: "เกินจำนวนนี้ ลบเวอร์ชันเก่าสุดออก", group: "retention" },
    { key: "revisionsDays", label: "อายุประวัติการแก้ไข", unit: "วัน", hint: "เวอร์ชันที่เก่ากว่านี้ย้อนกลับไม่ได้แล้ว", group: "retention" },
    { key: "trashDays", label: "เก็บในถังขยะ", unit: "วัน", hint: "ครบกำหนดแล้วลบถาวรพร้อมรูปที่ไม่ได้ใช้", group: "retention" },
    { key: "viewStatsDays", label: "เก็บสถิติการเข้าชมรายวัน", unit: "วัน", hint: "ใช้ในกราฟ — ยอดวิวสะสมไม่หาย", group: "retention" },
    { key: "dailyStatsDays", label: "เก็บสถิติการใช้งานหลังบ้าน", unit: "วัน", hint: "กราฟการเข้าสู่ระบบ/การกระทำในแดชบอร์ด", group: "retention" },
    { key: "r2QuotaGB", label: "โควตาพื้นที่รูป (R2)", unit: "GB", hint: "แพ็กเกจฟรี 10 GB", group: "quota" },
    { key: "firestoreQuotaMB", label: "โควตาฐานข้อมูล (Firestore)", unit: "MB", hint: "แพ็กเกจฟรี 1,024 MB", group: "quota" },
    { key: "firestoreWritesPerDay", label: "โควตาการเขียนข้อมูลต่อวัน", unit: "ครั้ง", hint: "แพ็กเกจฟรี 20,000 ครั้ง/วัน", group: "quota" },
];

function Gauge({ title, icon: Icon, used, quota, usedLabel, quotaLabel, foot }: { title: string; icon: typeof HardDrive; used: number; quota: number; usedLabel: string; quotaLabel: string; foot?: React.ReactNode }) {
    const level = usageLevel(used, quota);
    const pct = quota ? Math.min(100, (used / quota) * 100) : 0;
    return (
        <div className="flex flex-col rounded-2xl border border-line bg-surface p-4 shadow-card">
            <div className="flex items-center gap-2.5">
                <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary"><Icon className="size-5" /></span>
                <p className="flex-1 text-sm font-bold text-fg-2">{title}</p>
                <Badge tone={LEVEL[level].badge}>{LEVEL[level].label}</Badge>
            </div>
            <p className="mt-3 flex items-baseline gap-1.5">
                <span className="tabular font-display text-2xl font-bold text-fg">{usedLabel}</span>
                <span className="text-xs text-muted">/ {quotaLabel}</span>
            </p>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={title}>
                <div className={cn("h-full rounded-full transition-all", LEVEL[level].bar)} style={{ width: `${Math.max(pct, 1.5)}%` }} />
            </div>
            <p className={cn("tabular mt-1 text-right text-xs font-bold", LEVEL[level].text)}>{pct.toFixed(pct < 10 ? 1 : 0)}%</p>
            {foot && <div className="mt-auto border-t border-line pt-3 text-xs text-muted">{foot}</div>}
        </div>
    );
}

export default function StoragePage() {
    const { isSuperAdmin, loading: authLoading } = useAuth();
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState("");
    const [draft, setDraft] = useState<StoragePolicy | null>(null);
    const [saving, setSaving] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [cleaning, setCleaning] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async (refresh = false) => {
        setError("");
        setRefreshing(true);
        try {
            const d = unwrapResponse(await api.get<ApiEnvelope<Data>>(`/storage${refresh ? "?refresh=1" : ""}`));
            setData(d);
            setDraft(d.policy);
        } catch (e) {
            setError(handleApiError(e));
        } finally {
            setRefreshing(false);
        }
    }, []);
    useEffect(() => {
        if (isSuperAdmin) void load();
    }, [isSuperAdmin, load]);

    const dirty = useMemo(() => !!data && !!draft && JSON.stringify(data.policy) !== JSON.stringify(draft), [data, draft]);
    const toClean = (data?.preview ?? []).reduce((s, p) => s + p.count, 0);

    const save = async () => {
        if (!draft) return;
        setSaving(true);
        try {
            const r = unwrapResponse(await api.put<ApiEnvelope<{ policy: StoragePolicy; preview: Data["preview"] }>>("/storage", draft));
            setData((d) => (d ? { ...d, policy: r.policy, preview: r.preview } : d));
            setDraft(r.policy);
            toastUtils.success("บันทึกนโยบายแล้ว", "ระบบจะล้างข้อมูลตามนี้ทุกวันเวลาประมาณ 03:00 น.");
        } catch (e) {
            toastUtils.error("บันทึกไม่สำเร็จ", handleApiError(e));
        } finally {
            setSaving(false);
        }
    };

    const cleanup = async () => {
        setCleaning(true);
        try {
            const r = unwrapResponse(await api.post<ApiEnvelope<Record<string, number>>>("/storage"));
            const total = Object.entries(r).filter(([k]) => k !== "imagesDeleted").reduce((s, [, v]) => s + v, 0);
            toastUtils.success("ล้างข้อมูลแล้ว", `ลบ ${total.toLocaleString()} รายการ${r.imagesDeleted ? ` และรูป ${r.imagesDeleted} รูป` : ""}`);
            setConfirm(false);
            await load(true);
        } catch (e) {
            toastUtils.error("ล้างข้อมูลไม่สำเร็จ", handleApiError(e));
        } finally {
            setCleaning(false);
        }
    };

    if (!authLoading && !isSuperAdmin) return <EmptyState art="security" title="เฉพาะผู้ดูแลสูงสุด" description="การจัดการพื้นที่จัดเก็บเปิดให้เฉพาะผู้ดูแลสูงสุด" />;

    const u = data?.usage;
    const p = data?.policy;
    const levels = u && p ? [usageLevel(u.r2.bytes, p.r2QuotaGB * 1073741824), usageLevel(u.firestore.bytes, p.firestoreQuotaMB * 1048576), usageLevel(u.today.writes, p.firestoreWritesPerDay)] : [];
    const worst: Level = levels.includes("danger") ? "danger" : levels.includes("warn") ? "warn" : "ok";
    const maxBytes = Math.max(1, ...(u?.firestore.collections.map((c) => c.bytes) ?? [1]));

    return (
        <div className="w-full space-y-6">
            <PageHeader title="พื้นที่จัดเก็บ" description="ดูการใช้พื้นที่ ตั้งระยะเวลาเก็บข้อมูล และล้างข้อมูลเก่าไม่ให้เต็มโควตา" art="settings">
                <button type="button" className="btn-secondary" onClick={() => load(true)} disabled={refreshing} aria-label="วัดใหม่">
                    <RefreshCw className={cn("size-4", refreshing && "animate-spin")} /> <span className="hidden sm:inline">วัดใหม่</span>
                </button>
                <button type="button" className="btn-primary" onClick={() => setConfirm(true)} disabled={!data}>
                    <Sparkles className="size-4" /> ล้างข้อมูลเก่าตอนนี้
                </button>
            </PageHeader>

            {error && (
                <Section>
                    <EmptyState art="settings" title="วัดพื้นที่ไม่สำเร็จ" description={error} action={<button type="button" className="btn-primary" onClick={() => load(true)}>ลองใหม่</button>} />
                </Section>
            )}

            {u && p && worst !== "ok" && (
                <div className={cn("flex gap-3 rounded-2xl p-4 text-sm", worst === "danger" ? "bg-negative-soft text-negative" : "bg-warning-soft text-warning")}>
                    <AlertTriangle className="size-5 shrink-0" />
                    <div>
                        <p className="font-bold">พื้นที่บางส่วนใกล้เต็มโควตา</p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
                            {levels[0] !== "ok" && <li>รูปบน R2: ลบรูปที่ไม่ได้ใช้ที่ <Link href="/admin/media" className="font-bold underline">คลังรูป</Link> หรือลดวันเก็บในถังขยะ</li>}
                            {levels[1] !== "ok" && <li>ฐานข้อมูล: ลดวันเก็บบันทึกระบบ/ประวัติการแก้ไข แล้วกด &ldquo;ล้างข้อมูลเก่าตอนนี้&rdquo;</li>}
                            {levels[2] !== "ok" && <li>การเขียนข้อมูลวันนี้สูง: ปิด &ldquo;เก็บสถิติการเข้าชมรายวัน&rdquo; ชั่วคราวได้ (ยอดวิวสะสมยังนับต่อ)</li>}
                        </ul>
                    </div>
                </div>
            )}

            {/* มาตรวัด */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {!u || !p ? (
                    [0, 1, 2].map((i) => <Skeleton key={i} className="h-[190px] rounded-2xl" />)
                ) : (
                    <>
                        <Gauge
                            title="รูปภาพ (Cloudflare R2)"
                            icon={Images}
                            used={u.r2.bytes}
                            quota={p.r2QuotaGB * 1073741824}
                            usedLabel={fmt(u.r2.bytes)}
                            quotaLabel={`${p.r2QuotaGB} GB`}
                            foot={<>รูปของหลังบ้าน {u.r2.ownObjects.toLocaleString()} ไฟล์ ({fmt(u.r2.ownBytes)}) · ไฟล์อื่นใน bucket {(u.r2.objects - u.r2.ownObjects).toLocaleString()} · <Link href="/admin/media" className="font-bold text-primary">จัดการรูป</Link></>}
                        />
                        <Gauge
                            title="ฐานข้อมูล (Firestore)"
                            icon={Database}
                            used={u.firestore.bytes}
                            quota={p.firestoreQuotaMB * 1048576}
                            usedLabel={fmt(u.firestore.bytes)}
                            quotaLabel={`${p.firestoreQuotaMB.toLocaleString()} MB`}
                            foot={<>{u.firestore.docs.toLocaleString()} เอกสาร · ขนาดเป็นค่าประมาณจากตัวอย่างข้อมูล</>}
                        />
                        <Gauge
                            title="การเขียนข้อมูลวันนี้"
                            icon={PenLine}
                            used={u.today.writes}
                            quota={p.firestoreWritesPerDay}
                            usedLabel={u.today.writes.toLocaleString()}
                            quotaLabel={`${p.firestoreWritesPerDay.toLocaleString()} ครั้ง`}
                            foot={<>การเข้าชม {u.today.views.toLocaleString()} ครั้ง · การกระทำในหลังบ้าน {u.today.actions.toLocaleString()} ครั้ง (ประมาณ)</>}
                        />
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
                {/* รายคอลเลกชัน */}
                <Section title="ข้อมูลในฐานข้อมูล" description={u ? `วัดเมื่อ ${new Date(u.measuredAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })} (อัปเดตทุก 10 นาที)` : undefined} bodyClassName="divide-y divide-line">
                    {!u ? (
                        <div className="space-y-2 p-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-11 rounded-xl" />)}</div>
                    ) : (
                        [...u.firestore.collections]
                            .sort((a, b) => b.bytes - a.bytes)
                            .map((c) => {
                                const clean = data?.preview.find((x) => x.key === c.key)?.count ?? 0;
                                return (
                                    <div key={c.key} className="px-4 py-3 sm:px-5">
                                        <div className="flex items-center gap-2">
                                            <p className="min-w-0 flex-1 truncate text-sm font-bold text-fg">{c.label}</p>
                                            <Badge tone={c.group === "content" ? "primary" : c.group === "system" ? "gray" : "amber"}>{GROUP[c.group]}</Badge>
                                        </div>
                                        <div className="mt-1.5 flex items-center gap-3">
                                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                                                <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.max(1, (c.bytes / maxBytes) * 100)}%` }} />
                                            </div>
                                            <span className="tabular w-36 shrink-0 text-right text-xs text-muted">
                                                {c.count.toLocaleString()} รายการ · {fmt(c.bytes)}
                                            </span>
                                        </div>
                                        {clean > 0 && <p className="mt-1 text-[11px] font-bold text-warning">เก่ากว่ากำหนด {clean.toLocaleString()} รายการ — จะถูกล้างรอบถัดไป</p>}
                                    </div>
                                );
                            })
                    )}
                </Section>

                {/* นโยบาย */}
                <Section
                    title="นโยบายการเก็บข้อมูล"
                    description="ระบบล้างข้อมูลเก่าอัตโนมัติทุกวัน ~03:00 น."
                    actions={
                        <button type="button" className="btn-primary btn-sm shrink-0" onClick={save} disabled={!dirty || saving}>
                            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} บันทึก
                        </button>
                    }
                    className="xl:sticky xl:top-4"
                    bodyClassName="space-y-5 p-4 sm:p-5"
                >
                    {!draft ? (
                        Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
                    ) : (
                        <>
                            {(["retention", "quota"] as const).map((g) => (
                                <div key={g} className="space-y-3">
                                    <p className="text-xs font-bold text-muted">{g === "retention" ? "ระยะเวลาเก็บ" : "โควตาของแพ็กเกจ (ใช้คำนวณเปอร์เซ็นต์)"}</p>
                                    {FIELDS.filter((f) => f.group === g).map((f) => {
                                        const [min, max] = LIMITS[f.key];
                                        const v = draft[f.key] as number;
                                        const bad = !Number.isFinite(v) || v < min || v > max;
                                        return (
                                            <label key={f.key} className="block">
                                                <span className="flex items-center justify-between gap-2 text-sm font-bold text-fg">
                                                    {f.label}
                                                    <span className="text-[11px] font-normal text-muted">{min.toLocaleString()}–{max.toLocaleString()}</span>
                                                </span>
                                                <span className="mt-1 flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        inputMode="numeric"
                                                        min={min}
                                                        max={max}
                                                        value={Number.isFinite(v) ? v : ""}
                                                        onChange={(e) => setDraft((d) => (d ? { ...d, [f.key]: e.target.value === "" ? NaN : Number(e.target.value) } : d))}
                                                        className={cn("field tabular py-2", bad && "border-negative")}
                                                    />
                                                    <span className="w-14 shrink-0 text-xs text-muted">{f.unit}</span>
                                                </span>
                                                <span className={cn("mt-1 block text-[11px]", bad ? "text-negative" : "text-muted")}>{bad ? `ต้องอยู่ระหว่าง ${min}–${max} (ระบบจะปรับให้อัตโนมัติ)` : f.hint}</span>
                                            </label>
                                        );
                                    })}
                                    {g === "retention" && (
                                        <label className="flex items-start gap-3 rounded-2xl border border-line p-3">
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm font-bold text-fg">เก็บสถิติการเข้าชมรายวัน</span>
                                                <span className="block text-[11px] text-muted">ใช้ 1 การเขียนต่อการเข้าชม 1 ครั้ง — ปิดชั่วคราวได้ถ้าการเขียนข้อมูลใกล้เต็ม (ยอดวิวสะสมยังนับต่อ)</span>
                                            </span>
                                            <Switch checked={draft.viewStatsEnabled} onChange={(v) => setDraft((d) => (d ? { ...d, viewStatsEnabled: v } : d))} label="เก็บสถิติการเข้าชมรายวัน" />
                                        </label>
                                    )}
                                </div>
                            ))}
                            {u?.lastCleanup?.at && (
                                <p className="rounded-xl bg-surface-2 p-3 text-[11px] text-muted">
                                    ล้างล่าสุด {new Date(u.lastCleanup.at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })} ({u.lastCleanup.by === "cron" ? "อัตโนมัติ" : "กดเอง"}) · ลบ{" "}
                                    {Object.entries(u.lastCleanup.result).filter(([k]) => k !== "imagesDeleted").reduce((s, [, v]) => s + Number(v), 0).toLocaleString()} รายการ
                                </p>
                            )}
                        </>
                    )}
                </Section>
            </div>

            <Modal
                open={confirm}
                onClose={() => !cleaning && setConfirm(false)}
                title="ล้างข้อมูลเก่าตามนโยบาย?"
                description={dirty ? "มีการแก้นโยบายที่ยังไม่บันทึก — ระบบจะใช้นโยบายที่บันทึกไว้ล่าสุด" : "ข้อมูลต่อไปนี้จะถูกลบถาวร (เนื้อหาหลัก เช่น ข่าว กิจกรรม ไม่ถูกแตะ)"}
                footer={
                    <>
                        <button type="button" className="btn-secondary" onClick={() => setConfirm(false)} disabled={cleaning}>ยกเลิก</button>
                        <button type="button" className="btn bg-negative text-white hover:opacity-90" onClick={cleanup} disabled={cleaning || toClean === 0}>
                            {cleaning ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} ล้าง {toClean.toLocaleString()} รายการ
                        </button>
                    </>
                }
            >
                <ul className="divide-y divide-line rounded-2xl border border-line">
                    {data?.preview.map((x) => (
                        <li key={x.key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                            <span className="text-fg-2">{x.label}</span>
                            <span className={cn("tabular font-bold", x.count ? "text-negative" : "text-muted")}>{x.count.toLocaleString()}</span>
                        </li>
                    ))}
                </ul>
                <p className="mt-3 text-xs text-muted">นอกจากนี้จะตัดประวัติการแก้ไขที่เกิน {p?.revisionsMax} เวอร์ชันต่อเนื้อหา และลบรูปของรายการในถังขยะที่ไม่มีที่ใช้แล้ว</p>
            </Modal>
        </div>
    );
}
