"use client";

import { useState } from "react";
import { User } from "@/types/user";
import { userService } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, LogOut, KeyRound } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import Image from "next/image";
import { ThemeToggle } from "@/app/components/ThemeToggle";

export default function ForceChangePassword({ user }: { user: User }) {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newPassword.length < 6) return toast({ title: "ผิดพลาด", description: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร", variant: "destructive" });
        if (newPassword !== confirmPassword) return toast({ title: "ผิดพลาด", description: "การยืนยันรหัสผ่านไม่ตรงกัน", variant: "destructive" });

        setSaving(true);
        try {
            await userService.updateMyProfile({
                password: newPassword,
            });
            
            toast({ title: "สำเร็จ", description: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว กรุณารอสักครู่...", variant: "default" });
            
            // Hard reload to refresh session payload without Next.js router cache
            setTimeout(() => {
                window.location.href = "/admin";
            }, 1000);
            
        } catch (error: any) {
            console.error("Change password error:", error);
            const errorMsg = error?.response?.data?.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้";
            toast({ title: "เกิดข้อผิดพลาด", description: errorMsg, variant: "destructive" });
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        try {
            await authApi.logout();
            window.location.href = "/auth/login?logout=success";
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center 
        bg-gradient-to-br from-sky-100 via-white to-sky-200 
        dark:from-slate-950 dark:via-slate-900 dark:to-slate-950
        px-4 py-12 sm:px-6 lg:px-8 absolute inset-0 z-50">

            <div className="w-full max-w-md space-y-8 
            bg-white/80 backdrop-blur-xl dark:bg-slate-900/80
            border border-sky-100 dark:border-slate-800
            p-10 shadow-2xl rounded-3xl dark:shadow-slate-900/20">

                {/* Header */}
                <div className="text-center relative">
                    <div className="absolute right-0 top-0">
                        <ThemeToggle />
                    </div>
                    <div className="mx-auto w-14 h-14 flex items-center justify-center shadow-sky-200 rounded-full bg-transparent dark:bg-slate-800/50">
                        <Image src="/Image/LOGO-MSS.png" alt="MSS-Logo" width={100} height={100} priority />
                    </div>

                    <h2 className="mt-6 text-xl font-black text-sky-500 dark:text-sky-400 tracking-tight">
                        ยินดีต้อนรับ, <span className="text-fg">{user.firstName}</span>
                    </h2>

                    <p className="mt-2 text-sm text-muted">
                        เพื่อความปลอดภัย กรุณาตั้งรหัสผ่านใหม่ของคุณ<br/>เพื่อเข้าใช้งานระบบ
                    </p>
                </div>

                {/* Form */}
                <form className="mt-8 space-y-6" onSubmit={handleSave}>
                    <div className="space-y-4">
                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                required
                                disabled={saving}
                                placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full rounded-xl border border-sky-200 dark:border-slate-800
                                    px-4 py-3 pr-10 text-fg placeholder-slate-400 dark:placeholder-slate-500
                                    dark:bg-slate-950
                                    focus:border-sky-500 focus:ring-2 focus:ring-sky-400
                                    disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-900 dark:disabled:text-slate-500
                                    outline-none transition-all duration-300"
                            />
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => setShowPassword(!showPassword)}
                                className="cursor-pointer absolute inset-y-0 right-3 flex items-center text-sky-500 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300 transition disabled:opacity-50"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                        
                        <div className="relative">
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                required
                                disabled={saving}
                                placeholder="ยืนยันรหัสผ่านใหม่"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full rounded-xl border border-sky-200 dark:border-slate-800
                                    px-4 py-3 pr-10 text-fg placeholder-slate-400 dark:placeholder-slate-500
                                    dark:bg-slate-950
                                    focus:border-sky-500 focus:ring-2 focus:ring-sky-400
                                    disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-900 dark:disabled:text-slate-500
                                    outline-none transition-all duration-300"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className={`w-full rounded-xl flex items-center justify-center gap-2
                    cursor-pointer bg-gradient-to-r from-sky-500 to-sky-600
                    py-3 text-sm font-bold text-white
                    shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 
                    transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                    >
                        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound className="h-5 w-5" />}
                        {saving ? "กำลังบันทึก..." : "อัปเดตรหัสผ่าน"}
                    </button>
                    
                    <div className="text-center pt-2">
                        <button
                            type="button"
                            onClick={handleLogout}
                            disabled={saving}
                            className="text-xs text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                            <LogOut size={14} />
                            ออกจากระบบไปก่อน
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
