"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { handleApiError } from "@/lib/axios/index";
import { toastUtils } from "@/lib/toast";
import Image from "next/image";
import logo from "../../../../public/Image/LOGO-MSS.png";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const cleanEmail = email.trim();

        if (!cleanEmail) {
            setError("กรุณากรอกอีเมล");
            toastUtils.warning("ข้อมูลไม่ครบถ้วน", "กรุณากรอกอีเมล");
            return;
        }

        if (!emailRegex.test(cleanEmail)) {
            setError("รูปแบบอีเมลไม่ถูกต้อง");
            toastUtils.warning("ข้อมูลไม่ถูกต้อง", "รูปแบบอีเมลไม่ถูกต้อง");
            return;
        }

        setLoading(true);

        try {
            await authApi.resetPassword(cleanEmail);
            setIsSuccess(true);
            toastUtils.success("ส่งอีเมลสำเร็จ", "กรุณาตรวจสอบกล่องจดหมายของคุณเพื่อรีเซ็ตรหัสผ่าน", { duration: 5000 });
        } catch (err: any) {
            let errorMessage = "เกิดข้อผิดพลาดในการส่งอีเมลรีเซ็ตรหัสผ่าน";
            
            if (err.response && err.response.status === 404) {
                errorMessage = "ไม่พบบัญชีผู้ใช้นี้ในระบบ";
            } else {
                errorMessage = handleApiError(err);
            }
            
            setError(errorMessage);
            toastUtils.error("ส่งอีเมลไม่สำเร็จ", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center 
    bg-gradient-to-br from-sky-100 via-white to-sky-200 
    dark:from-slate-950 dark:via-slate-900 dark:to-slate-950
    px-4 py-12 sm:px-6 lg:px-8">

            <div className="w-full max-w-md space-y-8 
        bg-white/80 backdrop-blur-xl dark:bg-slate-900/80
        border border-sky-100 dark:border-slate-800
        p-10 shadow-2xl rounded-3xl dark:shadow-slate-900/20 relative">

                {/* Header */}
                <div className="text-center">
                    <div className="mx-auto w-14 h-14 flex items-center justify-center shadow-sky-200 rounded-full bg-transparent dark:bg-slate-800/50">
                        <Image src={logo} alt="MSS-Logo" width={100} height={100} />
                    </div>

                    <h2 className="mt-6 text-3xl font-black text-sky-500 dark:text-sky-400 tracking-tight">
                        Reset <span className="text-fg"> Password</span> <ThemeToggle />
                    </h2>

                    <p className="mt-2 text-sm text-muted">
                        กรอกอีเมลของคุณเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่
                    </p>
                </div>

                {isSuccess ? (
                    <div className="mt-8 space-y-6">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 text-center space-y-3">
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-800 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-400">ตรวจสอบกล่องจดหมาย</h3>
                            <p className="text-sm text-emerald-600 dark:text-emerald-500">
                                เราได้ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปยังอีเมล <strong>{email}</strong> แล้ว กรุณาตรวจสอบอีเมลและทำตามขั้นตอน
                            </p>
                        </div>
                        
                        <Link href="/auth/login" className="flex items-center justify-center w-full gap-2 py-3 text-sm font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/40 rounded-xl transition-colors">
                            <ArrowLeft size={16} /> กลับไปหน้าเข้าสู่ระบบ
                        </Link>
                    </div>
                ) : (
                    /* Form */
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                className="w-full rounded-xl border border-sky-200 dark:border-slate-800
                            px-4 py-3 text-fg placeholder-slate-400 dark:placeholder-slate-500
                            dark:bg-slate-950
                            focus:border-sky-500 focus:ring-2 focus:ring-sky-400
                            disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-900 dark:disabled:text-slate-500
                            outline-none transition-all duration-300"
                            />
                        </div>

                        {error && (
                            <div className={`text-sm text-center p-3 rounded-xl bg-red-50 text-red-500 dark:bg-red-950/30 dark:text-red-400`}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full rounded-xl 
                        cursor-pointer bg-gradient-to-r from-sky-500 to-sky-600
                        py-3 text-sm font-semibold text-white
                        shadow-lg shadow-sky-200 dark:shadow-sky-900/30
                        hover:from-sky-600 hover:to-sky-700
                        hover:shadow-xl hover:scale-[1.02]
                        active:scale-95
                        transition-all duration-300
                        focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900
                        ${loading ? "opacity-70 cursor-not-allowed grayscale" : ""}
                    `}
                        >
                            {loading ? "กำลังส่งลิงก์..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
                        </button>
                        
                        <div className="text-center mt-6">
                            <Link 
                                href="/auth/login" 
                                className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors inline-flex items-center gap-1"
                            >
                                <ArrowLeft size={14} /> กลับไปหน้าเข้าสู่ระบบ
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
