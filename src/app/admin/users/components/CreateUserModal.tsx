"use client";

import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { Modal, Segmented, Switch } from "@/app/components/ui/kit";
import { userService } from "@/services/userService";
import { ROLE_HINT, ROLE_LABEL, type DepartmentMap, type Role } from "@/lib/access/menus";
import { handleApiError } from "@/lib/axios";
import { toastUtils } from "@/lib/toast";
import { DepartmentPicker } from "./DepartmentPicker";
import { CredentialCard } from "./CredentialCard";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY = { firstName: "", lastName: "", email: "", phoneNumber: "", role: "admin" as Role, departments: [] as string[], password: "" };

/** เพิ่มผู้ใช้ในหน้าต่างเดียว: ระบบสร้างรหัสชั่วคราวให้ แล้วแสดงข้อความพร้อมส่ง */
export function CreateUserModal({ open, onClose, onCreated, map, onMapChange }: { open: boolean; onClose: () => void; onCreated: () => void; map: DepartmentMap; onMapChange: (m: DepartmentMap) => void }) {
    const [form, setForm] = useState(EMPTY);
    const [ownPassword, setOwnPassword] = useState(false);
    const [touched, setTouched] = useState(false);
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState<{ name: string; email: string; password: string } | null>(null);

    const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm((f) => ({ ...f, [k]: v }));
    const errors = {
        firstName: !form.firstName.trim() ? "กรอกชื่อ" : "",
        lastName: !form.lastName.trim() ? "กรอกนามสกุล" : "",
        email: !EMAIL_RE.test(form.email.trim()) ? "อีเมลไม่ถูกต้อง" : "",
        phoneNumber: form.phoneNumber && !/^0\d{8,9}$/.test(form.phoneNumber) ? "เบอร์ 9–10 หลัก ขึ้นต้นด้วย 0" : "",
        password: ownPassword && form.password.length < 8 ? "อย่างน้อย 8 ตัวอักษร" : "",
    };
    const show = (k: keyof typeof errors) => (touched ? errors[k] : "");

    const close = () => {
        if (saving) return;
        setForm(EMPTY);
        setOwnPassword(false);
        setTouched(false);
        setDone(null);
        onClose();
    };

    const submit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setTouched(true);
        if (Object.values(errors).some(Boolean)) return;
        setSaving(true);
        try {
            const r = await userService.createUser({
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim().toLowerCase(),
                phoneNumber: form.phoneNumber,
                role: form.role,
                departments: form.role === "superadmin" ? [] : form.departments,
                ...(ownPassword ? { password: form.password } : {}),
            });
            onCreated();
            setDone({ name: `${form.firstName} ${form.lastName}`.trim(), email: form.email.trim().toLowerCase(), password: r.tempPassword ?? form.password });
        } catch (err) {
            toastUtils.error("เพิ่มผู้ใช้ไม่สำเร็จ", handleApiError(err));
        } finally {
            setSaving(false);
        }
    };

    if (done) {
        return (
            <Modal open={open} onClose={close} title="เพิ่มผู้ใช้เรียบร้อย" description={`ส่งข้อมูลนี้ให้ ${done.name} เพื่อเข้าสู่ระบบครั้งแรก`} footer={<button type="button" className="btn-secondary" onClick={close}>เสร็จสิ้น</button>}>
                <CredentialCard {...done} />
            </Modal>
        );
    }

    const field = (k: "firstName" | "lastName" | "email" | "phoneNumber", label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
        <label className="block">
            <span className="label">{label}</span>
            <input {...props} className="field" value={form[k]} onChange={(e) => set(k, k === "phoneNumber" ? e.target.value.replace(/\D/g, "") : k === "email" ? e.target.value.replace(/\s/g, "") : e.target.value)} />
            {show(k) && <span className="mt-1 block text-xs text-negative">{show(k)}</span>}
        </label>
    );

    return (
        <Modal
            open={open}
            onClose={close}
            size="md"
            title="เพิ่มผู้ใช้งาน"
            description="ระบบจะสร้างรหัสผ่านชั่วคราวให้ และผู้ใช้ต้องตั้งรหัสใหม่เมื่อเข้าครั้งแรก"
            footer={
                <>
                    <button type="button" className="btn-secondary" onClick={close} disabled={saving}>ยกเลิก</button>
                    <button type="button" className="btn-primary" onClick={() => submit()} disabled={saving}>
                        {saving ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />} เพิ่มผู้ใช้
                    </button>
                </>
            }
        >
            <form onSubmit={submit} noValidate className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    {field("firstName", "ชื่อ", { autoFocus: true, maxLength: 60, placeholder: "สมชาย" })}
                    {field("lastName", "นามสกุล", { maxLength: 60, placeholder: "ใจดี" })}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr]">
                    {field("email", "อีเมล (ใช้เข้าสู่ระบบ)", { type: "email", inputMode: "email", placeholder: "somchai@example.com", autoComplete: "off" })}
                    {field("phoneNumber", "เบอร์โทร (ไม่บังคับ)", { type: "tel", inputMode: "numeric", maxLength: 10, placeholder: "08xxxxxxxx" })}
                </div>
                <div>
                    <span className="label">บทบาท</span>
                    <Segmented label="บทบาท" value={form.role} onChange={(v) => set("role", v)} options={(["admin", "user", "superadmin"] as Role[]).map((r) => ({ id: r, label: ROLE_LABEL[r] }))} />
                    <p className="mt-1.5 text-xs text-muted">{ROLE_HINT[form.role]}</p>
                </div>
                {form.role !== "superadmin" && (
                    <div>
                        <span className="label">ฝ่ายที่สังกัด</span>
                        <DepartmentPicker map={map} value={form.departments} onChange={(v) => set("departments", v)} onMapChange={onMapChange} />
                        {!form.departments.length && <p className="mt-1.5 text-xs text-warning">ยังไม่เลือกฝ่าย — ผู้ใช้จะยังไม่เห็นเมนูใด</p>}
                    </div>
                )}
                <div className="rounded-2xl border border-line p-3">
                    <label className="flex items-center gap-3">
                        <span className="flex-1 text-sm">
                            <span className="block font-bold text-fg">ตั้งรหัสผ่านเอง</span>
                            <span className="block text-xs text-muted">ปิดไว้ = ระบบสร้างรหัสชั่วคราวที่อ่านง่ายให้</span>
                        </span>
                        <Switch checked={ownPassword} onChange={setOwnPassword} label="ตั้งรหัสผ่านเอง" />
                    </label>
                    {ownPassword && (
                        <div className="mt-3">
                            <input type="text" className="field font-mono" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="อย่างน้อย 8 ตัวอักษร" autoComplete="new-password" />
                            {show("password") && <span className="mt-1 block text-xs text-negative">{show("password")}</span>}
                        </div>
                    )}
                </div>
            </form>
        </Modal>
    );
}
