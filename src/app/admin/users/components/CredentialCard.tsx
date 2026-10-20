"use client";

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { toastUtils } from "@/lib/toast";

/** การ์ดข้อมูลเข้าสู่ระบบ (แสดงครั้งเดียว) + ปุ่มคัดลอกข้อความพร้อมส่งให้ผู้ใช้ */
export function CredentialCard({ name, email, password, note }: { name: string; email: string; password: string; note?: string }) {
    const [copied, setCopied] = useState(false);
    const url = typeof window !== "undefined" ? `${window.location.origin}/auth/login` : "";
    const message = `สวัสดี ${name}\nบัญชีหลังบ้าน MSS ของคุณพร้อมใช้งานแล้ว\n\nเข้าสู่ระบบ: ${url}\nอีเมล: ${email}\nรหัสผ่านชั่วคราว: ${password}\n\nระบบจะให้ตั้งรหัสผ่านใหม่เมื่อเข้าสู่ระบบครั้งแรก`;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(message);
            setCopied(true);
            toastUtils.success("คัดลอกแล้ว", "วางส่งให้ผู้ใช้ทาง LINE หรืออีเมลได้เลย");
            setTimeout(() => setCopied(false), 2500);
        } catch {
            toastUtils.error("คัดลอกไม่สำเร็จ", "เลือกข้อความแล้วคัดลอกเองได้");
        }
    };

    return (
        <div className="space-y-3">
            <div className="rounded-2xl border border-primary/30 bg-primary-soft/50 p-4">
                <p className="flex items-center gap-1.5 text-xs font-bold text-primary"><KeyRound className="size-3.5" /> ข้อมูลเข้าสู่ระบบ (แสดงครั้งเดียว)</p>
                <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-muted">อีเมล</dt><dd className="truncate font-bold text-fg">{email}</dd></div>
                    <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted">รหัสผ่านชั่วคราว</dt>
                        <dd className="tabular rounded-lg bg-surface px-2.5 py-1 font-mono text-base font-bold tracking-wider text-fg select-all">{password}</dd>
                    </div>
                </dl>
                {note && <p className="mt-3 text-xs text-muted">{note}</p>}
            </div>
            <button type="button" onClick={copy} className="btn-primary w-full">
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "คัดลอกแล้ว" : "คัดลอกข้อความส่งให้ผู้ใช้"}
            </button>
            <p className="text-center text-[11px] text-muted">ระบบไม่เก็บรหัสนี้ไว้ — ถ้าลืมคัดลอก สร้างรหัสชั่วคราวใหม่ได้จากหน้าผู้ใช้</p>
        </div>
    );
}
