"use client";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { FormSkeleton } from "@/app/components/ui/FormSkeleton";

import { useState, useEffect } from "react";
import { User, Mail, Phone, Shield, Clock, Save, Loader2 } from "lucide-react";
import { userService } from "@/services/userService";
import { User as UserType } from "@/types/user";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
    const { toast } = useToast();
    const [user, setUser] = useState<UserType | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");

    // Password fields
    const [isChangePassword, setIsChangePassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const me = await userService.getMe();
                setUser(me);
                setFirstName(me.firstName || "");
                setLastName(me.lastName || "");
                setPhoneNumber(me.phoneNumber || "");
                setIsChangePassword(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            } catch {
                toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถโหลดข้อมูลโปรไฟล์ได้", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleSave = async () => {
        if (isChangePassword) {
            if (!currentPassword) return toast({ title: "ผิดพลาด", description: "กรุณาระบุรหัสผ่านปัจจุบัน", variant: "destructive" });
            if (newPassword.length < 6) return toast({ title: "ผิดพลาด", description: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร", variant: "destructive" });
            if (newPassword !== confirmPassword) return toast({ title: "ผิดพลาด", description: "การยืนยันรหัสผ่านไม่ตรงกัน", variant: "destructive" });
        }
        
        try {
            setSaving(true);
            const payload: any = { firstName, lastName, phoneNumber };
            if (isChangePassword) {
                payload.currentPassword = currentPassword;
                payload.password = newPassword;
            }
            const updated = await userService.updateMyProfile(payload);
            setUser(updated);
            toast({ title: "สำเร็จ", description: "อัปเดตโปรไฟล์เรียบร้อยแล้ว" });
            setIsChangePassword(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            const errorMsg = error?.response?.data?.message || "ไม่สามารถอัปเดตโปรไฟล์ได้";
            toast({ title: "เกิดข้อผิดพลาด", description: errorMsg, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const roleLabel: Record<string, string> = {
        superadmin: "Super Admin",
        admin: "Admin",
        user: "User",
    };

    if (loading) {
        return <FormSkeleton />;
    }

    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";

    return (
        <div className="w-full space-y-6">
            <PageHeader title="บัญชีของฉัน" description="แก้ไขข้อมูลส่วนตัวและเปลี่ยนรหัสผ่าน" art="profile" />

            {/* Avatar Card */}
            <div className="hero-bg rounded-3xl p-6 text-white shadow-[0_20px_40px_-20px_rgba(15,74,150,0.6)]">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold border-2 border-white/40">
                        {initials}
                    </div>
                    <div>
                        <div className="text-lg font-bold">{firstName} {lastName}</div>
                        <div className="text-sky-100 text-sm">{user?.email}</div>
                        <div className="mt-1 inline-flex items-center gap-1 bg-white/20 backdrop-blur px-2 py-0.5 rounded-full text-xs font-bold">
                            <Shield size={10} />
                            {roleLabel[user?.role || ""] || user?.role}
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Card */}
            <div className="bg-surface border border-line rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 space-y-5">
                    {/* Editable Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5">ชื่อ</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-surface-2 border border-line rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                                    placeholder="ชื่อ"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5">นามสกุล</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-surface-2 border border-line rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                                    placeholder="นามสกุล"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">เบอร์โทรศัพท์</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="tel"
                                value={phoneNumber}
                                maxLength={10}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-surface-2 border border-line rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                                placeholder="0xx-xxx-xxxx"
                            />
                        </div>
                    </div>

                    {/* Read-Only Fields */}
                    <div className="pt-4 border-t border-line space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5">อีเมล</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    value={user?.email || ""}
                                    readOnly
                                    className="w-full pl-10 pr-4 py-2.5 bg-surface-2 border border-line rounded-xl text-sm font-medium text-slate-400 cursor-not-allowed"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">บทบาท</label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        value={roleLabel[user?.role || ""] || user?.role || ""}
                                        readOnly
                                        className="w-full pl-10 pr-4 py-2.5 bg-surface-2 border border-line rounded-xl text-sm font-medium text-slate-400 cursor-not-allowed"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">เข้าสู่ระบบล่าสุด</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        value={user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('th-TH') : "-"}
                                        readOnly
                                        className="w-full pl-10 pr-4 py-2.5 bg-surface-2 border border-line rounded-xl text-sm font-medium text-slate-400 cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Password change toggle */}
                    <div className="pt-4 border-t border-line">
                        <label className="flex items-center gap-2 cursor-pointer mb-4">
                            <input 
                                type="checkbox" 
                                checked={isChangePassword}
                                onChange={(e) => setIsChangePassword(e.target.checked)}
                                className="rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                            />
                            <span className="text-sm font-bold text-fg-2">เปลี่ยนรหัสผ่าน</span>
                        </label>
                        
                        {isChangePassword && (
                            <div className="space-y-4 bg-surface-2 p-6 rounded-2xl border border-line">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">รหัสผ่านปัจจุบัน</label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="field"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="field"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">ยืนยันรหัสผ่านใหม่</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="field"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Save Button */}
                <div className="px-6 py-4 bg-surface-2 border-t border-line">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="cursor-pointer w-full sm:w-auto flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
                    </button>
                </div>
            </div>
        </div>
    );
}
