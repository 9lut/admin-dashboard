"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Pencil, Plus, RotateCcw, Save, Search, ShieldCheck, Trash2, Users } from "lucide-react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Badge, EmptyState, Modal, Section, Switch } from "@/app/components/ui/kit";
import { Skeleton } from "@/app/components/ui/skeleton";
import { permissionService } from "@/services/permissionService";
import { invalidateMenuAccess } from "@/hooks/useMenuAccess";
import { useAuth } from "@/hooks/useAuth";
import { ASSIGNABLE_MENUS, ROLE_HINT, ROLE_LABEL, type DepartmentMap, type Role } from "@/lib/access/menus";
import { toastUtils } from "@/lib/toast";
import { handleApiError } from "@/lib/axios";
import { cn } from "@/lib/utils";

const GROUPS = [...new Set(ASSIGNABLE_MENUS.map((m) => m.group))];
const sameSet = (a: string[] = [], b: string[] = []) => a.length === b.length && a.every((x) => b.includes(x));

type Dialog = { kind: "add" } | { kind: "rename"; name: string } | { kind: "delete"; name: string } | null;

export default function PermissionsPage() {
    const { isSuperAdmin, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState<DepartmentMap>({});
    const [draft, setDraft] = useState<DepartmentMap>({});
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [selected, setSelected] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [dialog, setDialog] = useState<Dialog>(null);
    const [nameInput, setNameInput] = useState("");
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await permissionService.getSettings(true);
            setSaved(res.departments ?? {});
            setDraft(res.departments ?? {});
            setCounts(res.memberCounts ?? {});
            setSelected((cur) => (cur && cur in (res.departments ?? {}) ? cur : Object.keys(res.departments ?? {}).sort((a, b) => a.localeCompare(b, "th"))[0] ?? null));
        } catch (e) {
            toastUtils.error("โหลดข้อมูลสิทธิ์ไม่สำเร็จ", handleApiError(e));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isSuperAdmin) void load();
    }, [isSuperAdmin, load]);

    const names = useMemo(() => Object.keys(draft).sort((a, b) => a.localeCompare(b, "th")), [draft]);
    const shown = names.filter((n) => n.toLowerCase().includes(query.trim().toLowerCase()));
    const dirtyNames = names.filter((n) => !(n in saved) || !sameSet(draft[n], saved[n]));
    const removedLocal = Object.keys(saved).filter((n) => !(n in draft));
    const dirty = dirtyNames.length > 0 || removedLocal.length > 0;

    // เตือนก่อนปิดแท็บถ้ายังไม่บันทึก
    useEffect(() => {
        if (!dirty) return;
        const warn = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);

    const setMenus = (dept: string, ids: string[]) => setDraft((d) => ({ ...d, [dept]: ids }));
    const toggle = (dept: string, id: string, on: boolean) => {
        const cur = draft[dept] ?? [];
        let next = on ? [...new Set([...cur, id])] : cur.filter((x) => x !== id);
        // ปฏิทินอยู่ใต้กิจกรรม: เปิดปฏิทินโดยไม่มีกิจกรรมก็ได้ แต่ปิดกิจกรรมแล้วให้ปิดปฏิทินตาม เพื่อไม่ให้สับสน
        if (!on && id === "/admin/activity") next = next.filter((x) => x !== "/admin/activity/calendar");
        setMenus(dept, next);
    };

    const save = async () => {
        setSaving(true);
        try {
            const res = await permissionService.updateSettings({ departments: draft });
            setSaved(res.departments);
            setDraft(res.departments);
            invalidateMenuAccess();
            toastUtils.success("บันทึกสิทธิ์สำเร็จ", "ผู้ใช้จะเห็นเมนูใหม่เมื่อโหลดหน้าอีกครั้ง");
        } catch (e) {
            toastUtils.error("บันทึกไม่สำเร็จ", handleApiError(e));
        } finally {
            setSaving(false);
        }
    };

    const openDialog = (d: Dialog) => {
        setNameInput(d && d.kind === "rename" ? d.name : "");
        setDialog(d);
    };

    const nameError = (() => {
        const n = nameInput.trim().replace(/\s+/g, " ");
        if (!dialog || dialog.kind === "delete") return "";
        if (!n) return "กรุณาระบุชื่อฝ่าย";
        if (n.length > 50) return "ชื่อฝ่ายยาวเกิน 50 ตัวอักษร";
        if (/[.~*/[\]]/.test(n)) return "ห้ามมีอักขระ . ~ * / [ ]";
        if (n in draft && !(dialog.kind === "rename" && dialog.name === n)) return "มีฝ่ายชื่อนี้อยู่แล้ว";
        return "";
    })();

    const confirmDialog = async () => {
        if (!dialog) return;
        const n = nameInput.trim().replace(/\s+/g, " ");
        if (dialog.kind === "add") {
            if (nameError) return;
            setDraft((d) => ({ ...d, [n]: [] }));
            setSelected(n);
            setDialog(null);
            return;
        }
        // ฝ่ายที่ยังไม่เคยบันทึก แก้ในเครื่องได้เลย · ฝ่ายที่บันทึกแล้วต้องยิง API (ย้ายผู้ใช้ไปด้วย)
        const local = !(dialog.name in saved);
        if (dialog.kind === "rename") {
            if (nameError) return;
            if (local) {
                setDraft((d) => {
                    const out: DepartmentMap = {};
                    for (const [k, v] of Object.entries(d)) out[k === dialog.name ? n : k] = v;
                    return out;
                });
                setSelected(n);
                setDialog(null);
                return;
            }
        }
        if (dialog.kind === "delete" && local) {
            setDraft((d) => {
                const out = { ...d };
                delete out[dialog.name];
                return out;
            });
            setSelected(null);
            setDialog(null);
            return;
        }
        setBusy(true);
        try {
            if (dialog.kind === "rename") {
                const r = await permissionService.renameDepartment(dialog.name, n);
                toastUtils.success("เปลี่ยนชื่อฝ่ายแล้ว", `ย้ายผู้ใช้ ${r.moved} คนไปยัง “${n}”`);
                setSelected(n);
            } else {
                const r = await permissionService.deleteDepartment(dialog.name);
                toastUtils.success("ลบฝ่ายแล้ว", `นำฝ่ายนี้ออกจากผู้ใช้ ${r.removed} คน`);
                setSelected(null);
            }
            invalidateMenuAccess();
            setDialog(null);
            await load();
        } catch (e) {
            toastUtils.error("ทำรายการไม่สำเร็จ", handleApiError(e));
        } finally {
            setBusy(false);
        }
    };

    if (!authLoading && !isSuperAdmin) {
        return <EmptyState art="security" title="เฉพาะผู้ดูแลสูงสุด" description="หน้านี้ใช้กำหนดสิทธิ์ของทุกฝ่าย จึงเปิดให้เฉพาะผู้ดูแลสูงสุดเท่านั้น" />;
    }

    const current = selected && selected in draft ? selected : null;
    const currentMenus = current ? draft[current] : [];

    return (
        <div className="w-full space-y-6">
            <PageHeader title="สิทธิ์การเข้าถึง" description="กำหนดว่าแต่ละฝ่ายเข้าเมนูใดได้บ้าง — ผู้ใช้หลายฝ่ายจะได้สิทธิ์รวมกัน" art="permissions">
                <button type="button" onClick={() => openDialog({ kind: "add" })} disabled={loading} className="btn-secondary">
                    <Plus size={16} /> เพิ่มฝ่าย
                </button>
                {dirty && (
                    <button type="button" onClick={() => setDraft(saved)} disabled={saving} className="btn-ghost">
                        <RotateCcw size={16} /> ยกเลิกการแก้ไข
                    </button>
                )}
                <button type="button" onClick={save} disabled={saving || !dirty} className="btn-primary">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    บันทึก{dirty ? ` (${dirtyNames.length + removedLocal.length})` : ""}
                </button>
            </PageHeader>

            {/* บทบาท */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(["superadmin", "admin", "user"] as Role[]).map((r) => (
                    <div key={r} className="flex items-start gap-3 rounded-2xl border border-line bg-surface-2/60 p-4">
                        <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", r === "superadmin" ? "bg-primary text-primary-fg" : "bg-primary-soft text-primary")}>
                            <ShieldCheck className="size-4" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-fg">{ROLE_LABEL[r]}</p>
                            <p className="mt-0.5 text-xs leading-relaxed text-muted">{ROLE_HINT[r]}</p>
                        </div>
                    </div>
                ))}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
                    <Skeleton className="h-[420px] rounded-3xl" />
                    <Skeleton className="h-[420px] rounded-3xl" />
                </div>
            ) : names.length === 0 ? (
                <Section>
                    <EmptyState
                        art="permissions"
                        title="ยังไม่มีฝ่ายในระบบ"
                        description="สร้างฝ่าย (เช่น ฝ่ายประชาสัมพันธ์, ฝ่ายวิชาการ) แล้วเลือกเมนูที่ฝ่ายนั้นใช้งานได้"
                        action={
                            <button type="button" onClick={() => openDialog({ kind: "add" })} className="btn-primary">
                                <Plus size={16} /> เพิ่มฝ่ายแรก
                            </button>
                        }
                    />
                </Section>
            ) : (
                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[320px_1fr]">
                    {/* รายชื่อฝ่าย */}
                    <Section title={`ฝ่ายทั้งหมด (${names.length})`} className="lg:sticky lg:top-4" bodyClassName="p-3">
                        <div className="relative mb-2">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาฝ่าย…" aria-label="ค้นหาฝ่าย" className="input h-10 pl-9" />
                        </div>
                        <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 hide-scrollbar lg:mx-0 lg:block lg:max-h-[60vh] lg:space-y-1 lg:overflow-y-auto lg:px-0 custom-scrollbar">
                            {shown.map((n) => {
                                const on = n === current;
                                const changed = dirtyNames.includes(n);
                                return (
                                    <li key={n} className="shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setSelected(n)}
                                            aria-current={on}
                                            className={cn(
                                                "flex w-full min-w-[180px] items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors lg:min-w-0",
                                                on ? "border-primary/40 bg-primary-soft" : "border-transparent hover:bg-surface-2",
                                            )}
                                        >
                                            <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl text-sm font-bold", on ? "bg-primary text-primary-fg" : "bg-surface-2 text-fg-2")}>
                                                {n.charAt(0)}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className={cn("block truncate text-sm font-bold", on ? "text-primary" : "text-fg")}>{n}</span>
                                                <span className="block text-xs text-muted">
                                                    {counts[n] ?? 0} คน · {draft[n].length}/{ASSIGNABLE_MENUS.length} เมนู
                                                </span>
                                            </span>
                                            {changed && <span className="size-2 shrink-0 rounded-full bg-warning" title="ยังไม่บันทึก" />}
                                        </button>
                                    </li>
                                );
                            })}
                            {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">ไม่พบฝ่าย</li>}
                        </ul>
                    </Section>

                    {/* เมนูของฝ่ายที่เลือก */}
                    {current ? (
                        <Section
                            title={
                                <span className="flex flex-wrap items-center gap-2">
                                    {current}
                                    {!(current in saved) && <Badge tone="amber">ใหม่ ยังไม่บันทึก</Badge>}
                                </span>
                            }
                            description={
                                <span className="inline-flex items-center gap-1">
                                    <Users className="size-3.5" /> สมาชิก {counts[current] ?? 0} คน ·{" "}
                                    <Link href={`/admin/users?department=${encodeURIComponent(current)}`} className="font-bold text-primary hover:underline">
                                        ดูรายชื่อ
                                    </Link>
                                </span>
                            }
                            actions={
                                <div className="flex shrink-0 items-center gap-1">
                                    <button type="button" onClick={() => openDialog({ kind: "rename", name: current })} disabled={dirty && current in saved} title={dirty && current in saved ? "บันทึกการแก้ไขก่อน" : "เปลี่ยนชื่อ"} className="grid size-9 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-primary disabled:opacity-40" aria-label="เปลี่ยนชื่อฝ่าย">
                                        <Pencil className="size-4" />
                                    </button>
                                    <button type="button" onClick={() => openDialog({ kind: "delete", name: current })} disabled={dirty && current in saved} title={dirty && current in saved ? "บันทึกการแก้ไขก่อน" : "ลบฝ่าย"} className="grid size-9 place-items-center rounded-xl text-muted hover:bg-negative-soft hover:text-negative disabled:opacity-40" aria-label="ลบฝ่าย">
                                        <Trash2 className="size-4" />
                                    </button>
                                </div>
                            }
                            bodyClassName="p-4 sm:p-5"
                        >
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm text-fg-2">
                                    เปิดใช้ <b className="text-primary">{currentMenus.length}</b> จาก {ASSIGNABLE_MENUS.length} เมนู
                                </p>
                                <div className="flex gap-2">
                                    <button type="button" className="btn-secondary btn-sm" onClick={() => setMenus(current, ASSIGNABLE_MENUS.map((m) => m.id))}>
                                        <Check className="size-3.5" /> เลือกทั้งหมด
                                    </button>
                                    <button type="button" className="btn-ghost btn-sm" onClick={() => setMenus(current, [])}>
                                        ล้าง
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-5">
                                {GROUPS.map((g) => (
                                    <div key={g}>
                                        <p className="mb-2 text-xs font-bold text-muted">{g}</p>
                                        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                                            {ASSIGNABLE_MENUS.filter((m) => m.group === g).map((m) => {
                                                const on = currentMenus.includes(m.id);
                                                return (
                                                    <li key={m.id}>
                                                        <label className={cn("flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors", on ? "bg-primary-soft/40" : "hover:bg-surface-2")}>
                                                            <span className="min-w-0 flex-1">
                                                                <span className="block text-sm font-bold text-fg">{m.label}</span>
                                                                <span className="block text-xs text-muted">{m.description}</span>
                                                            </span>
                                                            <Switch checked={on} onChange={(v) => toggle(current, m.id, v)} label={`${m.label} สำหรับ ${current}`} />
                                                        </label>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                ))}
                                <p className="rounded-2xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">
                                    เมนู <b>ผู้ใช้งาน</b>, <b>สิทธิ์การเข้าถึง</b> และ <b>บันทึกระบบ</b> สงวนไว้สำหรับผู้ดูแลสูงสุดเท่านั้น · เมนู <b>บัญชีของฉัน</b> ทุกคนเข้าได้
                                </p>
                            </div>
                        </Section>
                    ) : (
                        <Section>
                            <EmptyState art="permissions" title="เลือกฝ่ายเพื่อกำหนดสิทธิ์" description="แตะชื่อฝ่ายทางซ้าย แล้วเปิด/ปิดเมนูที่ต้องการ" />
                        </Section>
                    )}
                </div>
            )}

            {/* ตารางสรุปทุกฝ่าย (จอใหญ่) */}
            {!loading && names.length > 0 && (
                <Section title="ตารางสรุปสิทธิ์" description="แตะช่องเพื่อเปิด/ปิดได้ทันที" className="hidden md:block" bodyClassName="overflow-x-auto custom-scrollbar">
                    <table className="w-full min-w-[640px] text-sm">
                        <thead>
                            <tr className="border-b border-line bg-surface-2/60">
                                <th className="sticky left-0 bg-surface px-4 py-3 text-left text-xs font-bold text-muted">เมนู</th>
                                {names.map((n) => (
                                    <th key={n} className="px-3 py-3 text-center text-xs font-bold whitespace-nowrap text-fg-2">
                                        <button type="button" onClick={() => setSelected(n)} className="hover:text-primary">{n}</button>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {ASSIGNABLE_MENUS.map((m) => (
                                <tr key={m.id} className="hover:bg-surface-2/50">
                                    <td className="sticky left-0 bg-surface px-4 py-2.5 font-medium whitespace-nowrap text-fg">{m.label}</td>
                                    {names.map((n) => {
                                        const on = draft[n].includes(m.id);
                                        return (
                                            <td key={n} className="px-3 py-2.5 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => toggle(n, m.id, !on)}
                                                    aria-pressed={on}
                                                    aria-label={`${m.label} — ${n}`}
                                                    className={cn("mx-auto grid size-7 place-items-center rounded-lg border transition-colors", on ? "border-primary bg-primary text-primary-fg" : "border-line-strong text-transparent hover:border-primary")}
                                                >
                                                    <Check className="size-4" />
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Section>
            )}

            <Modal
                open={dialog?.kind === "add" || dialog?.kind === "rename"}
                onClose={() => !busy && setDialog(null)}
                title={dialog?.kind === "rename" ? "เปลี่ยนชื่อฝ่าย" : "เพิ่มฝ่ายใหม่"}
                description={dialog?.kind === "rename" && dialog.name in saved ? `ผู้ใช้ ${counts[dialog.name] ?? 0} คนในฝ่ายนี้จะถูกย้ายไปชื่อใหม่ทันที` : "ตั้งชื่อฝ่าย แล้วเลือกเมนูที่ฝ่ายนี้ใช้ได้"}
                footer={
                    <>
                        <button type="button" className="btn-secondary" onClick={() => setDialog(null)} disabled={busy}>ยกเลิก</button>
                        <button type="button" className="btn-primary" onClick={confirmDialog} disabled={busy || !!nameError}>
                            {busy && <Loader2 className="size-4 animate-spin" />} {dialog?.kind === "rename" ? "เปลี่ยนชื่อ" : "เพิ่มฝ่าย"}
                        </button>
                    </>
                }
            >
                <label className="label" htmlFor="dept-name">ชื่อฝ่าย</label>
                <input
                    id="dept-name"
                    autoFocus
                    value={nameInput}
                    maxLength={50}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !nameError && confirmDialog()}
                    placeholder="เช่น ฝ่ายประชาสัมพันธ์"
                    className="input"
                />
                <p className={cn("mt-1.5 text-xs", nameError && nameInput ? "text-negative" : "text-muted")}>{nameError && nameInput ? nameError : `${nameInput.trim().length}/50 ตัวอักษร`}</p>
            </Modal>

            <Modal
                open={dialog?.kind === "delete"}
                onClose={() => !busy && setDialog(null)}
                title={`ลบฝ่าย “${dialog?.kind === "delete" ? dialog.name : ""}”?`}
                description={
                    dialog?.kind === "delete" && dialog.name in saved
                        ? `ฝ่ายนี้จะถูกนำออกจากผู้ใช้ ${counts[dialog.name] ?? 0} คน และสิทธิ์เมนูของฝ่ายนี้จะหายไป ย้อนกลับไม่ได้`
                        : "ฝ่ายนี้ยังไม่ได้บันทึก จะถูกนำออกจากรายการ"
                }
                footer={
                    <>
                        <button type="button" className="btn-secondary" onClick={() => setDialog(null)} disabled={busy}>ยกเลิก</button>
                        <button type="button" className="btn bg-negative text-white hover:opacity-90" onClick={confirmDialog} disabled={busy}>
                            {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} ลบฝ่าย
                        </button>
                    </>
                }
            />
        </div>
    );
}
