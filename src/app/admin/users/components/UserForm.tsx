"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Copy, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, X } from "lucide-react";
import { FormHeader } from "@/app/components/ui/FormHeader";
import { Badge, Modal, Section } from "@/app/components/ui/kit";
import { Skeleton } from "@/app/components/ui/skeleton";
import { userService } from "@/services/userService";
import { permissionService } from "@/services/permissionService";
import { useAuth } from "@/hooks/useAuth";
import { ASSIGNABLE_MENUS, ROLE_HINT, ROLE_LABEL, allowedMenus, type DepartmentMap, type Role } from "@/lib/access/menus";
import { handleApiError } from "@/lib/axios";
import { toastUtils } from "@/lib/toast";
import type { User } from "@/types/user";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES: Role[] = ["admin", "user", "superadmin"];

function Field({ label, error, hint, children, required }: { label: string; error?: string; hint?: string; children: React.ReactNode; required?: boolean }) {
    return (
        <div>
            <span className="label">
                {label} {required && <span className="text-negative">*</span>}
            </span>
            {children}
            {error ? (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-negative">
                    <AlertCircle className="size-3.5" /> {error}
                </p>
            ) : (
                hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>
            )}
        </div>
    );
}

export default function UserForm({ userToEdit }: { userToEdit?: User | null }) {
    const router = useRouter();
    const { user: me } = useAuth();
    const isEdit = !!userToEdit;
    const isSelf = isEdit && userToEdit?._id === me?._id;

    const [form, setForm] = useState({
        email: userToEdit?.email ?? "",
        firstName: userToEdit?.firstName ?? "",
        lastName: userToEdit?.lastName ?? "",
        phoneNumber: userToEdit?.phoneNumber ?? "",
        role: (userToEdit?.role ?? "admin") as Role,
        departments: userToEdit?.departments ?? [],
    });
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [touched, setTouched] = useState(false);
    const [saving, setSaving] = useState(false);

    const [deptMap, setDeptMap] = useState<DepartmentMap | null>(null);
    const [resetOpen, setResetOpen] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [tempPassword, setTempPassword] = useState<string | null>(null);

    useEffect(() => {
        permissionService
            .getSettings()
            .then((s) => setDeptMap(s.departments ?? {}))
            .catch(() => setDeptMap({}));
    }, []);

    const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
    const deptNames = useMemo(() => Object.keys(deptMap ?? {}).sort((a, b) => a.localeCompare(b, "th")), [deptMap]);
    // ฝ่ายที่ผู้ใช้มีแต่ถูกลบออกจากระบบไปแล้ว
    const orphan = form.departments.filter((d) => deptMap && !(d in deptMap));
    const access = useMemo(() => allowedMenus(form.role, form.departments, deptMap ?? {}), [form.role, form.departments, deptMap]);

    const errors = {
        firstName: !form.firstName.trim() ? "กรุณากรอกชื่อ" : "",
        lastName: !form.lastName.trim() ? "กรุณากรอกนามสกุล" : "",
        email: !form.email.trim() ? "กรุณากรอกอีเมล" : !EMAIL_RE.test(form.email.trim()) ? "รูปแบบอีเมลไม่ถูกต้อง เช่น somchai@example.com" : "",
        phoneNumber: form.phoneNumber && !/^0\d{8,9}$/.test(form.phoneNumber) ? "เบอร์โทรต้องขึ้นต้นด้วย 0 และมี 9–10 หลัก" : "",
        password: isEdit ? "" : password.length < 8 ? "รหัสผ่านอย่างน้อย 8 ตัวอักษร" : "",
        confirm: isEdit ? "" : confirm !== password ? "รหัสผ่านไม่ตรงกัน" : "",
    };
    const invalid = Object.values(errors).some(Boolean);
    const show = (k: keyof typeof errors) => (touched ? errors[k] : "");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(true);
        if (invalid) {
            toastUtils.warning("ข้อมูลไม่ครบถ้วน", "กรุณาตรวจสอบช่องที่มีเครื่องหมายแจ้งเตือน");
            return;
        }
        setSaving(true);
        const payload = {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            phoneNumber: form.phoneNumber,
            role: form.role,
            departments: form.role === "superadmin" ? [] : form.departments.filter((d) => !deptMap || d in deptMap),
        };
        try {
            if (isEdit && userToEdit) {
                await userService.updateUser(userToEdit._id, payload);
                toastUtils.success("บันทึกแล้ว", "แก้ไขข้อมูลผู้ใช้เรียบร้อย");
            } else {
                await userService.createUser({ ...payload, email: form.email.trim().toLowerCase(), password } as Partial<User>);
                toastUtils.success("เพิ่มผู้ใช้แล้ว", "ผู้ใช้จะต้องเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งแรก");
            }
            router.push("/admin/users");
            router.refresh();
        } catch (err) {
            toastUtils.error("บันทึกไม่สำเร็จ", handleApiError(err));
            setSaving(false);
        }
    };

    const resetPassword = async () => {
        if (!userToEdit) return;
        setResetting(true);
        try {
            const res = await userService.resetUserPassword(userToEdit._id);
            setTempPassword(res.tempPassword);
            setResetOpen(false);
        } catch (err) {
            toastUtils.error("สร้างรหัสผ่านไม่สำเร็จ", handleApiError(err));
        } finally {
            setResetting(false);
        }
    };

    return (
        <>
            <FormHeader
                title={isEdit ? `แก้ไข: ${userToEdit?.firstName ?? ""} ${userToEdit?.lastName ?? ""}` : "เพิ่มผู้ใช้งานใหม่"}
                description={isEdit ? userToEdit?.email : "สร้างบัญชีผู้ดูแล กำหนดบทบาทและฝ่าย"}
                backUrl="/admin/users"
                formId="user-form"
                isLoading={saving}
                saveLabel={isEdit ? "บันทึกการแก้ไข" : "สร้างบัญชี"}
            />

            <form id="user-form" onSubmit={submit} noValidate className="grid w-full grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="min-w-0 space-y-5">
                    <Section title="ข้อมูลส่วนตัว" bodyClassName="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
                        <Field label="ชื่อ" required error={show("firstName")}>
                            <input className="input" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="สมชาย" autoComplete="given-name" maxLength={60} />
                        </Field>
                        <Field label="นามสกุล" required error={show("lastName")}>
                            <input className="input" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="ใจดี" autoComplete="family-name" maxLength={60} />
                        </Field>
                        <Field label="อีเมล (ใช้เข้าสู่ระบบ)" required error={show("email")} hint={isEdit ? "อีเมลเปลี่ยนไม่ได้หลังสร้างบัญชี" : undefined}>
                            <input
                                className="input disabled:cursor-not-allowed disabled:opacity-60"
                                type="email"
                                inputMode="email"
                                value={form.email}
                                disabled={isEdit}
                                onChange={(e) => set("email", e.target.value.replace(/\s/g, ""))}
                                placeholder="somchai@example.com"
                                autoComplete="off"
                            />
                        </Field>
                        <Field label="เบอร์โทรศัพท์" error={show("phoneNumber")} hint="ตัวเลข 9–10 หลัก (ไม่บังคับ)">
                            <input className="input tabular" type="tel" inputMode="numeric" maxLength={10} value={form.phoneNumber} onChange={(e) => set("phoneNumber", e.target.value.replace(/\D/g, ""))} placeholder="0812345678" />
                        </Field>
                    </Section>

                    <Section title="บทบาท" description={isSelf ? "คุณไม่สามารถลดบทบาทของตัวเองได้" : "กำหนดระดับการเข้าถึงหลัก"} bodyClassName="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3 sm:p-6">
                        {ROLES.map((r) => {
                            const on = form.role === r;
                            const disabled = isSelf && r !== "superadmin" && userToEdit?.role === "superadmin";
                            return (
                                <label
                                    key={r}
                                    className={cn(
                                        "relative flex cursor-pointer flex-col gap-1 rounded-2xl border-2 p-4 transition-colors",
                                        on ? "border-primary bg-primary-soft/50" : "border-line hover:border-line-strong",
                                        disabled && "pointer-events-none opacity-40",
                                    )}
                                >
                                    <input type="radio" name="role" value={r} checked={on} disabled={disabled} onChange={() => set("role", r)} className="sr-only" />
                                    <span className="flex items-center justify-between">
                                        <span className={cn("text-sm font-bold", on ? "text-primary" : "text-fg")}>{ROLE_LABEL[r]}</span>
                                        <span className={cn("grid size-5 place-items-center rounded-full border-2", on ? "border-primary bg-primary text-primary-fg" : "border-line-strong")}>
                                            {on && <Check className="size-3" strokeWidth={3} />}
                                        </span>
                                    </span>
                                    <span className="text-xs leading-relaxed text-muted">{ROLE_HINT[r]}</span>
                                </label>
                            );
                        })}
                    </Section>

                    <Section
                        title="ฝ่ายที่สังกัด"
                        description={form.role === "superadmin" ? "ผู้ดูแลสูงสุดเข้าได้ทุกเมนูอยู่แล้ว ไม่ต้องกำหนดฝ่าย" : "เลือกได้หลายฝ่าย — สิทธิ์เมนูจะรวมกัน"}
                        actions={<Link href="/admin/permissions" className="btn-ghost btn-sm shrink-0">จัดการฝ่าย</Link>}
                        bodyClassName="p-5 sm:p-6"
                    >
                        {deptMap === null ? (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}
                            </div>
                        ) : deptNames.length === 0 ? (
                            <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">
                                ยังไม่มีฝ่ายในระบบ — <Link href="/admin/permissions" className="font-bold text-primary hover:underline">สร้างฝ่ายก่อน</Link>
                            </p>
                        ) : (
                            <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2", form.role === "superadmin" && "pointer-events-none opacity-40")}>
                                {deptNames.map((d) => {
                                    const on = form.departments.includes(d);
                                    return (
                                        <label key={d} className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors", on ? "border-primary/50 bg-primary-soft/50" : "border-line hover:bg-surface-2")}>
                                            <input
                                                type="checkbox"
                                                checked={on}
                                                onChange={() => set("departments", on ? form.departments.filter((x) => x !== d) : [...form.departments, d])}
                                                className="size-4 accent-[var(--primary)]"
                                            />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-bold text-fg">{d}</span>
                                                <span className="block text-xs text-muted">{deptMap[d].length} เมนู</span>
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                        {orphan.length > 0 && (
                            <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-warning">
                                <AlertCircle className="size-3.5" /> ฝ่ายที่ถูกลบไปแล้วจะถูกนำออกเมื่อบันทึก:
                                {orphan.map((d) => <Badge key={d} tone="amber">{d}</Badge>)}
                            </p>
                        )}
                    </Section>

                    {!isEdit && (
                        <Section title="รหัสผ่านเริ่มต้น" description="ผู้ใช้จะถูกบังคับให้เปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งแรก" bodyClassName="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
                            <Field label="รหัสผ่าน" required error={show("password")} hint="อย่างน้อย 8 ตัวอักษร">
                                <div className="relative">
                                    <input className="input pr-11" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                                    <button type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} className="absolute inset-y-0 right-1 grid w-10 place-items-center text-muted hover:text-primary">
                                        {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </button>
                                </div>
                            </Field>
                            <Field label="ยืนยันรหัสผ่าน" required error={show("confirm")}>
                                <input className="input" type={showPw ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
                            </Field>
                        </Section>
                    )}
                </div>

                {/* ฝั่งขวา: สรุปสิทธิ์ที่จะได้ + รหัสผ่าน */}
                <aside className="min-w-0 space-y-5 xl:sticky xl:top-4 xl:self-start">
                    <Section title="เมนูที่เข้าถึงได้" description="สรุปจากบทบาทและฝ่ายที่เลือก" bodyClassName="p-4">
                        <ul className="space-y-1">
                            {ASSIGNABLE_MENUS.map((m) => {
                                const on = access.has(m.id);
                                return (
                                    <li key={m.id} className={cn("flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm", on ? "text-fg" : "text-muted")}>
                                        <span className={cn("grid size-5 shrink-0 place-items-center rounded-full", on ? "bg-positive-soft text-positive" : "bg-surface-2")}>
                                            {on ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" />}
                                        </span>
                                        <span className={cn(!on && "line-through decoration-line-strong")}>{m.label}</span>
                                    </li>
                                );
                            })}
                            {form.role === "superadmin" && (
                                <li className="flex items-center gap-2.5 rounded-xl bg-primary-soft px-3 py-2 text-sm font-bold text-primary">
                                    <ShieldCheck className="size-4" /> + ผู้ใช้งาน · สิทธิ์ · บันทึกระบบ
                                </li>
                            )}
                        </ul>
                        {form.role !== "superadmin" && access.size <= 1 && (
                            <p className="mt-3 rounded-xl bg-warning-soft p-3 text-xs text-warning">ผู้ใช้นี้จะยังไม่เห็นเมนูใดเลย (นอกจากบัญชีของตัวเอง) — เลือกฝ่ายอย่างน้อย 1 ฝ่าย</p>
                        )}
                    </Section>

                    {isEdit && !isSelf && (
                        <Section title="รหัสผ่าน" bodyClassName="p-5">
                            {tempPassword ? (
                                <div className="rounded-2xl border border-warning/30 bg-warning-soft p-4 text-center">
                                    <p className="text-xs font-bold text-warning">รหัสผ่านชั่วคราว (แสดงครั้งเดียว)</p>
                                    <code className="tabular mt-2 block rounded-xl bg-surface px-3 py-2 text-xl font-bold tracking-wider text-fg select-all">{tempPassword}</code>
                                    <button
                                        type="button"
                                        className="btn-secondary btn-sm mt-3"
                                        onClick={() => {
                                            void navigator.clipboard?.writeText(tempPassword);
                                            toastUtils.success("คัดลอกแล้ว", "ส่งรหัสนี้ให้ผู้ใช้ผ่านช่องทางที่ปลอดภัย");
                                        }}
                                    >
                                        <Copy className="size-3.5" /> คัดลอก
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-muted">ผู้ใช้ลืมรหัสผ่าน? สร้างรหัสผ่านชั่วคราวให้ แล้วผู้ใช้ต้องเปลี่ยนใหม่เมื่อเข้าสู่ระบบ</p>
                                    <button type="button" onClick={() => setResetOpen(true)} className="btn-danger mt-3 w-full">
                                        <KeyRound className="size-4" /> สร้างรหัสผ่านชั่วคราว
                                    </button>
                                </>
                            )}
                        </Section>
                    )}
                </aside>
            </form>

            <Modal
                open={resetOpen}
                onClose={() => !resetting && setResetOpen(false)}
                title="สร้างรหัสผ่านชั่วคราว?"
                description={`รหัสผ่านเดิมของ ${userToEdit?.firstName ?? ""} จะใช้ไม่ได้ทันที และจะถูกออกจากระบบทุกอุปกรณ์`}
                footer={
                    <>
                        <button type="button" className="btn-secondary" onClick={() => setResetOpen(false)} disabled={resetting}>ยกเลิก</button>
                        <button type="button" className="btn bg-negative text-white hover:opacity-90" onClick={resetPassword} disabled={resetting}>
                            {resetting ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} ยืนยัน
                        </button>
                    </>
                }
            />
        </>
    );
}
