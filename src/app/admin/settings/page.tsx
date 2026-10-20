"use client";
import { PageHeader } from "@/app/components/ui/PageHeader";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
    Settings, Save, Loader2, Trash2, Plus, Contact, HeartHandshake,
    Facebook, Instagram, Youtube, Upload,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { FormSkeleton } from "@/app/components/ui/FormSkeleton";
import { toastUtils } from "@/lib/toast";
import { settingsService, SiteSettings } from "@/services/settingsService";

const EMPTY: SiteSettings = {
    contact: { phones: [], email: "", socials: {} },
    donation: {},
};

const inputClass =
    "w-full px-3 py-2 border border-line rounded-lg bg-surface-2 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all text-sm";
const labelClass = "block text-sm font-medium text-fg-2 mb-1";

export default function SettingsPage() {
    const [data, setData] = useState<SiteSettings>(EMPTY);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        settingsService
            .get()
            .then((s) => setData({ ...EMPTY, ...s, contact: { ...EMPTY.contact, ...s.contact }, donation: { ...EMPTY.donation, ...s.donation } }))
            .catch(() => toastUtils.error("เกิดข้อผิดพลาด", "โหลดข้อมูลตั้งค่าไม่สำเร็จ"))
            .finally(() => setLoading(false));
    }, []);

    const setContact = (patch: Partial<SiteSettings["contact"]>) =>
        setData((d) => ({ ...d, contact: { ...d.contact, ...patch } }));
    const setSocial = (key: keyof SiteSettings["contact"]["socials"], value: string) =>
        setData((d) => ({ ...d, contact: { ...d.contact, socials: { ...d.contact.socials, [key]: value } } }));
    const setDonation = (patch: Partial<SiteSettings["donation"]>) =>
        setData((d) => ({ ...d, donation: { ...d.donation, ...patch } }));

    const setPhone = (i: number, patch: Partial<{ label: string; number: string }>) =>
        setData((d) => {
            const phones = [...d.contact.phones];
            phones[i] = { ...phones[i], ...patch };
            return { ...d, contact: { ...d.contact, phones } };
        });
    const addPhone = () => setContact({ phones: [...data.contact.phones, { label: "", number: "" }] });
    const removePhone = (i: number) => setContact({ phones: data.contact.phones.filter((_, idx) => idx !== i) });

    const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await settingsService.uploadQr(file);
            setDonation({ qrImage: url });
            toastUtils.success("สำเร็จ", "อัปโหลด QR แล้ว");
        } catch {
            toastUtils.error("เกิดข้อผิดพลาด", "อัปโหลด QR ไม่สำเร็จ");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await settingsService.update({
                ...data,
                contact: { ...data.contact, phones: data.contact.phones.filter((p) => p.number.trim()) },
            });
            toastUtils.success("สำเร็จ", "บันทึกการตั้งค่าเรียบร้อยแล้ว");
        } catch {
            toastUtils.error("เกิดข้อผิดพลาด", "บันทึกไม่สำเร็จ");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <FormSkeleton />;
    }

    return (
        <div className="w-full space-y-6">
            <PageHeader title="ติดต่อ & บริจาค" description="ข้อมูลติดต่อ ช่องทางโซเชียล และบัญชีรับบริจาคที่แสดงบนเว็บไซต์" art="contact">
                <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    บันทึก
                </button>
            </PageHeader>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contact */}
                <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
                    <h2 className="font-semibold text-fg-2 flex items-center gap-2">
                        <Contact size={18} className="text-sky-500" /> ข้อมูลติดต่อ
                    </h2>

                    <div>
                        <label className={labelClass}>เบอร์โทร</label>
                        <div className="space-y-2">
                            {data.contact.phones.map((p, i) => (
                                <div key={i} className="flex gap-2">
                                    <input className={`${inputClass} flex-1`} placeholder="ชื่อ (เช่น อมีร)" value={p.label} onChange={(e) => setPhone(i, { label: e.target.value })} />
                                    <input className={`${inputClass} flex-[1.4]`} placeholder="065-xxx-xxxx" value={p.number} onChange={(e) => setPhone(i, { number: e.target.value })} />
                                    <button type="button" onClick={() => removePhone(i)} className="text-slate-400 hover:text-red-500 px-1"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addPhone} className="mt-2 text-xs text-sky-500 font-bold hover:underline flex items-center gap-1"><Plus size={14} /> เพิ่มเบอร์</button>
                    </div>

                    <div>
                        <label className={labelClass}>อีเมล</label>
                        <input className={inputClass} type="email" value={data.contact.email} onChange={(e) => setContact({ email: e.target.value })} placeholder="example@gmail.com" />
                    </div>

                    <div className="space-y-2">
                        <label className={labelClass}>โซเชียล</label>
                        <div className="flex items-center gap-2"><Facebook size={16} className="text-slate-400 flex-none" /><input className={inputClass} value={data.contact.socials.facebook || ""} onChange={(e) => setSocial("facebook", e.target.value)} placeholder="ลิงก์ Facebook" /></div>
                        <div className="flex items-center gap-2"><Instagram size={16} className="text-slate-400 flex-none" /><input className={inputClass} value={data.contact.socials.instagram || ""} onChange={(e) => setSocial("instagram", e.target.value)} placeholder="ลิงก์ Instagram" /></div>
                        <div className="flex items-center gap-2"><Youtube size={16} className="text-slate-400 flex-none" /><input className={inputClass} value={data.contact.socials.youtube || ""} onChange={(e) => setSocial("youtube", e.target.value)} placeholder="ลิงก์ YouTube" /></div>
                    </div>

                    <div>
                        <label className={labelClass}>ที่อยู่ / เวลาทำการ (ถ้ามี)</label>
                        <input className={`${inputClass} mb-2`} value={data.contact.address || ""} onChange={(e) => setContact({ address: e.target.value })} placeholder="ที่อยู่" />
                        <input className={inputClass} value={data.contact.openingHours || ""} onChange={(e) => setContact({ openingHours: e.target.value })} placeholder="เวลาทำการ" />
                    </div>
                </div>

                {/* Donation */}
                <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
                    <h2 className="font-semibold text-fg-2 flex items-center gap-2">
                        <HeartHandshake size={18} className="text-emerald-500" /> การบริจาค / สนับสนุน
                    </h2>

                    <div>
                        <label className={labelClass}>ธนาคาร</label>
                        <input className={inputClass} value={data.donation.bankName || ""} onChange={(e) => setDonation({ bankName: e.target.value })} placeholder="เช่น ธนาคารกสิกรไทย" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className={labelClass}>เลขบัญชี</label>
                            <input className={inputClass} value={data.donation.accountNumber || ""} onChange={(e) => setDonation({ accountNumber: e.target.value })} placeholder="xxx-x-xxxxx-x" />
                        </div>
                        <div>
                            <label className={labelClass}>ชื่อบัญชี</label>
                            <input className={inputClass} value={data.donation.accountName || ""} onChange={(e) => setDonation({ accountName: e.target.value })} placeholder="ชื่อ-นามสกุล" />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>พร้อมเพย์ (PromptPay)</label>
                        <input className={inputClass} value={data.donation.promptpay || ""} onChange={(e) => setDonation({ promptpay: e.target.value })} placeholder="เบอร์ / เลขพร้อมเพย์" />
                    </div>
                    <div>
                        <label className={labelClass}>ข้อความเชิญชวน (ถ้ามี)</label>
                        <textarea rows={2} className={inputClass} value={data.donation.note || ""} onChange={(e) => setDonation({ note: e.target.value })} placeholder="เช่น ร่วมสนับสนุนกิจกรรมของชมรม" />
                    </div>

                    <div>
                        <label className={labelClass}>QR พร้อมเพย์</label>
                        <div className="flex items-center gap-3">
                            <div className="w-24 h-24 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center bg-surface-2 overflow-hidden relative">
                                {data.donation.qrImage ? (
                                    <Image src={data.donation.qrImage} alt="QR" fill className="object-contain p-1" sizes="96px" />
                                ) : (
                                    <span className="text-slate-300 text-xs">ยังไม่มี QR</span>
                                )}
                            </div>
                            <label className="cursor-pointer flex items-center gap-2 text-sm text-fg-2 border border-line px-3 py-2 rounded-lg hover:bg-surface-2">
                                {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} อัปโหลด QR
                                <input type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={handleQrUpload} />
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
