"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Clock, KeyRound, Loader2, Mail, Phone, Save, ShieldCheck, Trash2, X } from "lucide-react";
import { Badge, Segmented } from "@/app/components/ui/kit";
import { userService } from "@/services/userService";
import { ASSIGNABLE_MENUS, ROLE_HINT, ROLE_LABEL, allowedMenus, type DepartmentMap, type Role } from "@/lib/access/menus";
import { handleApiError } from "@/lib/axios";
import { toastUtils } from "@/lib/toast";
import type { User } from "@/types/user";
import { cn } from "@/lib/utils";
import { DepartmentPicker } from "./DepartmentPicker";
import { CredentialCard } from "./CredentialCard";

const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "ยังไม่เคยเข้าสู่ระบบ");

function Block({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="border-t border-line px-5 py-4">
            <div className="mb-2.5 flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-fg">{title}</h3>
                {action}
            </div>
            {children}
        </section>
    );
}

/**
 * แผงจัดการผู้ใช้ด้านข้าง — แก้บทบาท ฝ่าย ข้อมูลติดต่อ รีเซ็ตรหัส และลบ ได้จากหน้ารายการเลย
 */
export function UserDrawer({
    user,
    isSelf,
    map,
    onMapChange,
    onChanged,
    onClose,
    onDelete,
}: {
    user: User | null;
    isSelf: boolean;
    map: DepartmentMap;
    onMapChange: (m: DepartmentMap) => void;
    onChanged: (u: User) => void;
    onClose: () => void;
    onDelete: (u: User) => void;
}) {
    const [depts, setDepts] = useState<string[]>([]);
    const [info, setInfo] = useState({ firstName: "", lastName: "", phoneNumber: "" });
    const [busy, setBusy] = useState<string | null>(null);
    const [pendingRole, setPendingRole] = useState<Role | null>(null);
    const [temp, setTemp] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- เริ่มค่าใหม่ทุกครั้งที่เปิดผู้ใช้คนอื่น
        setDepts(user.departments ?? []);
        setInfo({ firstName: user.firstName ?? "", lastName: user.lastName ?? "", phoneNumber: user.phoneNumber ?? "" });
        setPendingRole(null);
        setTemp(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?._id]);

    useEffect(() => {
        if (!user) return;
        const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", esc);
        return () => window.removeEventListener("keydown", esc);
    }, [user, onClose]);

    const role = (user?.role ?? "admin") as Role;
    const access = useMemo(() => allowedMenus(role, depts, map), [role, depts, map]);
    const deptDirty = !!user && !same(depts, user.departments ?? []);
    const infoDirty = !!user && (info.firstName !== (user.firstName ?? "") || info.lastName !== (user.lastName ?? "") || info.phoneNumber !== (user.phoneNumber ?? ""));
    const orphan = depts.filter((d) => !(d in map));

    if (!user) return null;
    const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;

    const run = async (key: string, fn: () => Promise<User | void>, msg: string) => {
        setBusy(key);
        try {
            const u = await fn();
            if (u) onChanged(u);
            toastUtils.success(msg, "");
        } catch (e) {
            toastUtils.error("บันทึกไม่สำเร็จ", handleApiError(e));
        } finally {
            setBusy(null);
        }
    };

    const changeRole = (r: Role) => {
        if (r === role) return setPendingRole(null);
        // เลื่อนเป็นผู้ดูแลสูงสุดต้องกดยืนยันอีกครั้ง
        if (r === "superadmin") return setPendingRole(r);
        void run("role", () => userService.updateUser(user._id, { role: r }), `เปลี่ยนเป็น${ROLE_LABEL[r]}แล้ว`);
    };

    return (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={`จัดการ ${name}`}>
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose} />
            <aside className="animate-in absolute inset-y-0 right-0 flex w-full flex-col bg-surface shadow-pop sm:max-w-md sm:rounded-l-[28px]">
                {/* หัว */}
                <header className="flex items-start gap-3 p-5">
                    <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-sky-700 text-lg font-bold text-white">
                        {`${user.firstName?.charAt(0) ?? ""}${user.lastName?.charAt(0) ?? ""}`.toUpperCase() || "?"}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-lg font-bold text-fg">
                            {name} {isSelf && <Badge tone="primary">คุณ</Badge>}
                        </p>
                        <p className="flex items-center gap-1 truncate text-xs text-muted"><Mail className="size-3.5" /> {user.email}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted"><Clock className="size-3.5" /> เข้าล่าสุด {fmt(user.lastLoginAt)}</p>
                    </div>
                    <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2" aria-label="ปิด">
                        <X className="size-5" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto pb-6 custom-scrollbar">
                    {user.mustChangePassword && (
                        <p className="mx-5 mb-4 rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning">ผู้ใช้ยังไม่ได้ตั้งรหัสผ่านใหม่หลังได้รหัสชั่วคราว</p>
                    )}

                    <Block title="บทบาท" action={busy === "role" && <Loader2 className="size-4 animate-spin text-primary" />}>
                        <Segmented label="บทบาท" value={pendingRole ?? role} onChange={(v) => !isSelf && changeRole(v)} options={(["admin", "user", "superadmin"] as Role[]).map((r) => ({ id: r, label: ROLE_LABEL[r] }))} />
                        <p className="mt-1.5 text-xs text-muted">{isSelf ? "เปลี่ยนบทบาทของตัวเองไม่ได้" : ROLE_HINT[pendingRole ?? role]}</p>
                        {pendingRole === "superadmin" && (
                            <div className="mt-2 flex items-center gap-2 rounded-xl bg-warning-soft p-2.5 text-xs text-warning">
                                <ShieldCheck className="size-4 shrink-0" />
                                <span className="flex-1">ผู้ดูแลสูงสุดจัดการผู้ใช้และสิทธิ์ได้ทั้งหมด</span>
                                <button type="button" className="btn-ghost btn-sm" onClick={() => setPendingRole(null)}>ยกเลิก</button>
                                <button type="button" className="btn-primary btn-sm" onClick={() => run("role", async () => { const u = await userService.updateUser(user._id, { role: "superadmin" }); setPendingRole(null); return u; }, "เลื่อนเป็นผู้ดูแลสูงสุดแล้ว")}>
                                    ยืนยัน
                                </button>
                            </div>
                        )}
                    </Block>

                    {role !== "superadmin" && (
                        <Block
                            title="ฝ่ายที่สังกัด"
                            action={
                                deptDirty && (
                                    <span className="flex gap-1">
                                        <button type="button" className="btn-ghost btn-sm" onClick={() => setDepts(user.departments ?? [])}>คืนค่า</button>
                                        <button type="button" className="btn-primary btn-sm" disabled={busy === "dept"} onClick={() => run("dept", () => userService.updateUser(user._id, { departments: depts.filter((d) => d in map) }), "บันทึกฝ่ายแล้ว")}>
                                            {busy === "dept" ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} บันทึก
                                        </button>
                                    </span>
                                )
                            }
                        >
                            <DepartmentPicker map={map} value={depts.filter((d) => d in map)} onChange={setDepts} onMapChange={onMapChange} />
                            {orphan.length > 0 && <p className="mt-2 text-xs text-warning">ฝ่ายที่ถูกลบแล้ว: {orphan.join(", ")} — จะถูกนำออกเมื่อบันทึก</p>}
                        </Block>
                    )}

                    <Block title="เมนูที่เข้าได้" action={<Link href="/admin/permissions" className="text-xs font-bold text-primary hover:underline">ตั้งสิทธิ์ฝ่าย</Link>}>
                        <div className="flex flex-wrap gap-1.5">
                            {ASSIGNABLE_MENUS.map((m) => {
                                const on = access.has(m.id);
                                return (
                                    <span key={m.id} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs", on ? "bg-positive-soft font-bold text-positive" : "bg-surface-2 text-muted line-through")}>
                                        {on && <Check className="size-3" />} {m.label}
                                    </span>
                                );
                            })}
                        </div>
                        {role !== "superadmin" && access.size <= 1 && <p className="mt-2 text-xs text-warning">ผู้ใช้นี้ยังไม่เห็นเมนูใด — เลือกฝ่ายด้านบน</p>}
                    </Block>

                    <Block
                        title="ข้อมูลติดต่อ"
                        action={
                            infoDirty && (
                                <button
                                    type="button"
                                    className="btn-primary btn-sm"
                                    disabled={busy === "info" || !info.firstName.trim() || !info.lastName.trim() || (!!info.phoneNumber && !/^0\d{8,9}$/.test(info.phoneNumber))}
                                    onClick={() => run("info", () => userService.updateUser(user._id, { firstName: info.firstName.trim(), lastName: info.lastName.trim(), phoneNumber: info.phoneNumber }), "บันทึกข้อมูลแล้ว")}
                                >
                                    {busy === "info" ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} บันทึก
                                </button>
                            )
                        }
                    >
                        <div className="grid grid-cols-2 gap-2">
                            <input className="field py-2" value={info.firstName} maxLength={60} onChange={(e) => setInfo((i) => ({ ...i, firstName: e.target.value }))} aria-label="ชื่อ" placeholder="ชื่อ" />
                            <input className="field py-2" value={info.lastName} maxLength={60} onChange={(e) => setInfo((i) => ({ ...i, lastName: e.target.value }))} aria-label="นามสกุล" placeholder="นามสกุล" />
                            <div className="relative col-span-2">
                                <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                                <input className="field tabular py-2 pl-9" inputMode="numeric" maxLength={10} value={info.phoneNumber} onChange={(e) => setInfo((i) => ({ ...i, phoneNumber: e.target.value.replace(/\D/g, "") }))} aria-label="เบอร์โทร" placeholder="เบอร์โทร" />
                            </div>
                        </div>
                    </Block>

                    {!isSelf && (
                        <Block title="รหัสผ่าน">
                            {temp ? (
                                <CredentialCard name={name} email={user.email} password={temp} note="รหัสเดิมใช้ไม่ได้แล้ว และผู้ใช้ถูกออกจากระบบทุกอุปกรณ์" />
                            ) : (
                                <button
                                    type="button"
                                    className="btn-secondary w-full"
                                    disabled={busy === "pw"}
                                    onClick={() =>
                                        run(
                                            "pw",
                                            async () => {
                                                const r = await userService.resetUserPassword(user._id);
                                                setTemp(r.tempPassword);
                                                onChanged({ ...user, mustChangePassword: true });
                                            },
                                            "สร้างรหัสผ่านชั่วคราวแล้ว",
                                        )
                                    }
                                >
                                    {busy === "pw" ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} สร้างรหัสผ่านชั่วคราว (ผู้ใช้ลืมรหัส)
                                </button>
                            )}
                        </Block>
                    )}

                    {!isSelf && (
                        <Block title="ลบบัญชี">
                            <button type="button" className="btn-danger w-full" onClick={() => onDelete(user)}>
                                <Trash2 className="size-4" /> ลบบัญชีนี้
                            </button>
                        </Block>
                    )}
                </div>
            </aside>
        </div>
    );
}
