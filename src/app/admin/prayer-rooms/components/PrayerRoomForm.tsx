"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Clock, Link2, MapPin, Phone, Plus, Youtube } from "lucide-react";
import type { PrayerRoom } from "@/types/prayer-room";
import { prayerRoomService } from "@/services/prayerRoomService";
import { FormHeader } from "@/app/components/ui/FormHeader";
import { FormSkeleton } from "@/app/components/ui/FormSkeleton";
import { Section, Segmented } from "@/app/components/ui/kit";
import { FormField, ImageUploader, splitImages } from "@/app/components/ui/form";
import { RevisionHistory } from "@/app/components/content/RevisionHistory";
import { Skeleton } from "@/app/components/ui/skeleton";
import { toastUtils } from "@/lib/toast";
import { coordsFromMapsUrl } from "@/lib/inputs/images";
import { handleApiError } from "@/lib/axios";
import { cn } from "@/lib/utils";

// Leaflet ใช้ window → โหลดเฉพาะฝั่ง client
const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false, loading: () => <Skeleton className="h-72 w-full rounded-2xl" /> });

const FACULTIES = [
    "คณะการจัดการสิ่งแวดล้อม", "คณะการแพทย์แผนไทย", "คณะทรัพยากรธรรมชาติ", "คณะทันตแพทยศาสตร์", "คณะนิติศาสตร์", "คณะพยาบาลศาสตร์",
    "คณะวิทยาการจัดการ", "คณะวิทยาศาสตร์", "คณะวิศวกรรมศาสตร์", "คณะศิลปศาสตร์", "คณะสัตวแพทยศาสตร์", "คณะอุตสาหกรรมเกษตร",
    "คณะเทคนิคการแพทย์", "คณะเภสัชศาสตร์", "คณะเศรษฐศาสตร์", "คณะแพทยศาสตร์", "บัณฑิตวิทยาลัย", "วิทยาลัยนานาชาติ",
];
const CAPACITY_PRESETS = [10, 20, 30, 50, 100];
const COMMON_FACILITIES = ["ที่อาบน้ำละหมาด", "แอร์", "พัดลม", "ผ้าละหมาด", "อัลกุรอาน", "แยกชาย-หญิง", "ที่วางรองเท้า", "ห้องน้ำ"];
const DAYS = ["ทุกวัน", "จันทร์-ศุกร์", "จันทร์-เสาร์", "เสาร์-อาทิตย์"];
const HOURS_RE = /^(.*?):\s?(\d{2}:\d{2})\s?-\s?(\d{2}:\d{2})\s?น\.$/;

type State = {
    name_th: string;
    name_en: string;
    slug: string;
    place: string;
    faculty: string;
    detail: string;
    capacity: string;
    hoursMode: "builder" | "custom";
    days: string;
    open: string;
    close: string;
    hoursText: string;
    facilities: string[];
    phone: string;
    youtube_url: string;
    google_map_url: string;
    lat: string;
    lng: string;
    images: (string | File)[];
};

const EMPTY: State = {
    name_th: "", name_en: "", slug: "", place: "", faculty: "", detail: "", capacity: "",
    hoursMode: "builder", days: "ทุกวัน", open: "05:00", close: "21:00", hoursText: "",
    facilities: [], phone: "", youtube_url: "", google_map_url: "", lat: "", lng: "", images: [],
};


export default function PrayerRoomForm({ prayerRoomToEdit }: { prayerRoomToEdit?: PrayerRoom | null }) {
    const isEdit = !!prayerRoomToEdit;
    const router = useRouter();
    const [form, setForm] = useState<State>(EMPTY);
    const [original, setOriginal] = useState<string[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [touched, setTouched] = useState(false);
    const [advanced, setAdvanced] = useState(false);
    const [newFacility, setNewFacility] = useState("");

    useEffect(() => {
        if (!prayerRoomToEdit) return;
        prayerRoomService
            .getById(prayerRoomToEdit._id)
            .then((d) => {
                const m = (d.openingHours ?? "").match(HOURS_RE);
                setOriginal(d.images ?? []);
                setForm({
                    name_th: d.name_th || d.name || "",
                    name_en: d.name_en ?? "",
                    slug: d.slug ?? "",
                    place: d.place ?? "",
                    faculty: d.faculty ?? "",
                    detail: d.detail ?? "",
                    capacity: d.capacity ? String(d.capacity) : "",
                    hoursMode: m || !d.openingHours ? "builder" : "custom",
                    days: m?.[1] ?? "ทุกวัน",
                    open: m?.[2] ?? "05:00",
                    close: m?.[3] ?? "21:00",
                    hoursText: d.openingHours ?? "",
                    facilities: (d.facilities ?? []).filter(Boolean),
                    phone: d.phone ?? "",
                    youtube_url: d.youtube_url ?? "",
                    google_map_url: d.google_map_url ?? "",
                    lat: d.location?.[0] ? String(d.location[0]) : "",
                    lng: d.location?.[1] ? String(d.location[1]) : "",
                    images: d.images ?? [],
                });
            })
            .catch((e) => toastUtils.error("โหลดข้อมูลห้องละหมาดไม่สำเร็จ", handleApiError(e)))
            .finally(() => setLoadingDetail(false));
    }, [prayerRoomToEdit]);

    const set = <K extends keyof State>(k: K, v: State[K]) => setForm((f) => ({ ...f, [k]: v }));
    const openingHours = form.hoursMode === "builder" ? `${form.days}: ${form.open}-${form.close} น.` : form.hoursText.trim();
    const latN = Number(form.lat);
    const lngN = Number(form.lng);
    const hasCoords = form.lat !== "" && form.lng !== "" && !Number.isNaN(latN) && !Number.isNaN(lngN);

    const errors = useMemo(
        () => ({
            name_th: !form.name_th.trim() ? "กรุณากรอกชื่อห้องละหมาด" : "",
            place: !form.place.trim() ? "กรุณาระบุสถานที่ตั้ง" : "",
            capacity: form.capacity && !/^\d+$/.test(form.capacity) ? "ใส่เป็นตัวเลข" : "",
            hours: form.hoursMode === "builder" && form.open >= form.close ? "เวลาปิดต้องอยู่หลังเวลาเปิด" : "",
            phone: form.phone && !/^[0-9\-\s+]{6,20}$/.test(form.phone) ? "รูปแบบเบอร์โทรไม่ถูกต้อง" : "",
            youtube_url: form.youtube_url && !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(form.youtube_url) ? "ต้องเป็นลิงก์ YouTube" : "",
            coords: (form.lat || form.lng) && (!hasCoords || Math.abs(latN) > 90 || Math.abs(lngN) > 180) ? "พิกัดไม่ถูกต้อง" : "",
        }),
        [form, hasCoords, latN, lngN],
    );
    const show = (k: keyof typeof errors) => (touched ? errors[k] : "");

    const toggleFacility = (f: string) => set("facilities", form.facilities.includes(f) ? form.facilities.filter((x) => x !== f) : [...form.facilities, f]);
    const addCustomFacility = () => {
        const f = newFacility.trim();
        if (f && !form.facilities.includes(f)) set("facilities", [...form.facilities, f]);
        setNewFacility("");
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(true);
        if (Object.values(errors).some(Boolean)) {
            toastUtils.warning("ข้อมูลไม่ครบถ้วน", "กรุณาตรวจสอบช่องที่มีเครื่องหมายแจ้งเตือน");
            return;
        }
        setSaving(true);
        const location: [number, number] = hasCoords ? [latN, lngN] : [0, 0];
        const base = {
            name: form.name_th.trim(),
            name_th: form.name_th.trim(),
            name_en: form.name_en.trim(),
            slug: form.slug.trim(),
            place: form.place.trim(),
            detail: form.detail.trim(),
            faculty: form.faculty.trim(),
            openingHours,
            youtube_url: form.youtube_url.trim(),
            capacity: form.capacity ? Number(form.capacity) : 0,
            google_map_url: form.google_map_url.trim(),
            phone: form.phone.trim(),
        };
        const { files, libraryUrls, removed } = splitImages(form.images, original);
        try {
            if (isEdit && prayerRoomToEdit) {
                await prayerRoomService.update(prayerRoomToEdit._id, { ...base, location, facilities: form.facilities, image_urls: JSON.stringify(libraryUrls) }, files, removed);
                toastUtils.success("บันทึกแล้ว", "แก้ไขข้อมูลห้องละหมาดเรียบร้อย");
            } else {
                const fd = new FormData();
                Object.entries(base).forEach(([k, v]) => fd.append(k, String(v)));
                fd.append("location", JSON.stringify(location));
                fd.append("facilities", JSON.stringify(form.facilities));
                fd.append("image_urls", JSON.stringify(libraryUrls));
                files.forEach((f) => fd.append("images", f));
                await prayerRoomService.create(fd);
                toastUtils.success("เพิ่มห้องละหมาดแล้ว", "ห้องละหมาดจะแสดงบนเว็บไซต์ทันที");
            }
            router.push("/admin/prayer-rooms");
        } catch (err) {
            toastUtils.error("บันทึกไม่สำเร็จ", handleApiError(err));
            setSaving(false);
        }
    };

    if (loadingDetail) return <FormSkeleton />;

    return (
        <>
            <FormHeader
                title={isEdit ? `แก้ไข: ${form.name_th || "ห้องละหมาด"}` : "เพิ่มห้องละหมาดใหม่"}
                description="ข้อมูลนี้แสดงในหน้าห้องละหมาดและแผนที่บนเว็บไซต์"
                backUrl="/admin/prayer-rooms"
                formId="prayer-room-form"
                isLoading={saving}
                saveLabel={isEdit ? "บันทึกการแก้ไข" : "บันทึกห้องละหมาด"}
            />

            <form id="prayer-room-form" onSubmit={submit} noValidate className="grid w-full grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
                <div className="min-w-0 space-y-5">
                    <Section title="ข้อมูลห้องละหมาด" bodyClassName="space-y-4 p-5 sm:p-6">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField label="ชื่อห้องละหมาด" required error={show("name_th")}>
                                <input className="field" value={form.name_th} maxLength={150} onChange={(e) => set("name_th", e.target.value)} placeholder="เช่น ห้องละหมาดคณะวิศวกรรมศาสตร์" />
                            </FormField>
                            <FormField label="ชื่อภาษาอังกฤษ" hint="ใช้สร้างลิงก์ (URL) ของหน้า">
                                <input className="field" value={form.name_en} maxLength={150} onChange={(e) => set("name_en", e.target.value)} placeholder="e.g. Engineering Prayer Room" />
                            </FormField>
                            <FormField label="สถานที่ตั้ง" required error={show("place")} hint="อาคาร ชั้น หรือจุดสังเกต">
                                <div className="relative">
                                    <MapPin className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                                    <input className="field pl-10" value={form.place} maxLength={200} onChange={(e) => set("place", e.target.value)} placeholder="เช่น อาคาร R ชั้น 2" />
                                </div>
                            </FormField>
                            <FormField label="คณะ / หน่วยงาน" hint="เลือกจากรายการหรือพิมพ์เอง">
                                <input className="field" list="faculty-list" value={form.faculty} maxLength={120} onChange={(e) => set("faculty", e.target.value)} placeholder="เลือกหรือพิมพ์ชื่อคณะ" />
                                <datalist id="faculty-list">
                                    {FACULTIES.map((f) => <option key={f} value={f} />)}
                                </datalist>
                            </FormField>
                        </div>
                        <FormField label="รายละเอียด">
                            <textarea className="field min-h-28 leading-relaxed" rows={4} value={form.detail} onChange={(e) => set("detail", e.target.value)} placeholder="วิธีไปถึง ข้อควรรู้ หรือข้อมูลเพิ่มเติม" />
                        </FormField>

                        <button type="button" onClick={() => setAdvanced((a) => !a)} aria-expanded={advanced} className="flex items-center gap-1 text-xs font-bold text-primary">
                            <ChevronDown className={cn("size-4 transition-transform", advanced && "rotate-180")} /> ตั้งค่าลิงก์ (slug)
                        </button>
                        {advanced && (
                            <FormField label="Slug" hint="เว้นว่างเพื่อสร้างอัตโนมัติจากชื่อภาษาอังกฤษ · ลิงก์เดิมยังใช้ได้หลังเปลี่ยน">
                                <input className="field font-mono" value={form.slug} maxLength={120} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="engineering-prayer-room" />
                            </FormField>
                        )}
                    </Section>

                    <Section title="ความจุและเวลาเปิด" bodyClassName="space-y-5 p-5 sm:p-6">
                        <FormField label="ความจุ (คน)" error={show("capacity")}>
                            <div className="flex flex-wrap items-center gap-2">
                                {CAPACITY_PRESETS.map((c) => (
                                    <button key={c} type="button" onClick={() => set("capacity", String(c))} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-bold transition-colors", form.capacity === String(c) ? "border-primary bg-primary text-primary-fg" : "border-line-strong text-fg-2 hover:border-primary")}>
                                        {c === 100 ? "100+" : c}
                                    </button>
                                ))}
                                <input className="field tabular w-28 py-1.5" inputMode="numeric" value={form.capacity} onChange={(e) => set("capacity", e.target.value.replace(/\D/g, ""))} placeholder="ระบุเอง" aria-label="ความจุแบบระบุเอง" />
                            </div>
                        </FormField>

                        <FormField label="เวลาเปิด-ปิด" error={show("hours")} hint={<>จะแสดงเป็น: <b className="text-fg-2">{openingHours || "—"}</b></>}>
                            <div className="mb-3">
                                <Segmented label="รูปแบบเวลา" value={form.hoursMode} onChange={(v) => set("hoursMode", v)} options={[{ id: "builder", label: "เลือกเวลา" }, { id: "custom", label: "พิมพ์เอง" }]} />
                            </div>
                            {form.hoursMode === "builder" ? (
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
                                    <select className="field" value={form.days} onChange={(e) => set("days", e.target.value)} aria-label="วันที่เปิด">
                                        {DAYS.map((d) => <option key={d}>{d}</option>)}
                                    </select>
                                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:contents">
                                        <input type="time" className="field" value={form.open} onChange={(e) => set("open", e.target.value)} aria-label="เวลาเปิด" />
                                        <span className="text-center text-muted sm:hidden">–</span>
                                        <input type="time" className="field" value={form.close} onChange={(e) => set("close", e.target.value)} aria-label="เวลาปิด" />
                                    </div>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Clock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                                    <input className="field pl-10" value={form.hoursText} maxLength={120} onChange={(e) => set("hoursText", e.target.value)} placeholder="เช่น เปิดตามเวลาทำการของอาคาร" />
                                </div>
                            )}
                        </FormField>
                    </Section>

                    <Section title="สิ่งอำนวยความสะดวก" description="แตะเพื่อเลือก หรือพิมพ์เพิ่มเอง" bodyClassName="space-y-3 p-5 sm:p-6">
                        <div className="flex flex-wrap gap-2">
                            {[...new Set([...COMMON_FACILITIES, ...form.facilities])].map((f) => {
                                const on = form.facilities.includes(f);
                                return (
                                    <button key={f} type="button" onClick={() => toggleFacility(f)} aria-pressed={on} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors", on ? "border-primary bg-primary-soft text-primary" : "border-line-strong text-fg-2 hover:border-primary")}>
                                        {on && <Check className="size-3.5" />} {f}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex gap-2">
                            <input
                                className="field py-2"
                                value={newFacility}
                                maxLength={60}
                                onChange={(e) => setNewFacility(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        addCustomFacility();
                                    }
                                }}
                                placeholder="เพิ่มสิ่งอำนวยความสะดวกอื่น"
                            />
                            <button type="button" onClick={addCustomFacility} disabled={!newFacility.trim()} className="btn-secondary shrink-0">
                                <Plus className="size-4" /> เพิ่ม
                            </button>
                        </div>
                    </Section>

                    <Section title="ติดต่อและสื่อ" bodyClassName="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
                        <FormField label="เบอร์โทรศัพท์" error={show("phone")}>
                            <div className="relative">
                                <Phone className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                                <input className="field tabular pl-10" type="tel" inputMode="tel" value={form.phone} maxLength={20} onChange={(e) => set("phone", e.target.value)} placeholder="074-xxx-xxx" />
                            </div>
                        </FormField>
                        <FormField label="คลิปแนะนำ (YouTube)" error={show("youtube_url")}>
                            <div className="relative">
                                <Youtube className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                                <input className="field pl-10" type="url" value={form.youtube_url} onChange={(e) => set("youtube_url", e.target.value.trim())} placeholder="https://youtu.be/…" />
                            </div>
                        </FormField>
                    </Section>
                </div>

                <aside className="min-w-0 space-y-5 xl:sticky xl:top-4 xl:self-start">
                    <Section title="ตำแหน่งบนแผนที่" description="คลิกบนแผนที่ ค้นหา หรือวางลิงก์ Google Maps" bodyClassName="space-y-3 p-4">
                        <div className="overflow-hidden rounded-2xl">
                            <MapPicker lat={hasCoords ? latN : null} lng={hasCoords ? lngN : null} onChange={(la, ln) => setForm((f) => ({ ...f, lat: la.toFixed(6), lng: ln.toFixed(6) }))} />
                        </div>
                        <FormField label="ลิงก์ Google Maps" hint="วางลิงก์แล้วระบบจะดึงพิกัดให้อัตโนมัติ">
                            <div className="relative">
                                <Link2 className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                                <input
                                    className="field pl-10"
                                    type="url"
                                    value={form.google_map_url}
                                    onChange={(e) => {
                                        const url = e.target.value;
                                        const c = coordsFromMapsUrl(url);
                                        setForm((f) => ({ ...f, google_map_url: url, ...(c ? { lat: c[0], lng: c[1] } : {}) }));
                                        if (c) toastUtils.success("พบพิกัดจากลิงก์", `${c[0]}, ${c[1]}`);
                                    }}
                                    placeholder="https://maps.google.com/…"
                                />
                            </div>
                        </FormField>
                        <div className="grid grid-cols-2 gap-2">
                            <FormField label="ละติจูด">
                                <input className="field tabular font-mono text-xs" inputMode="decimal" value={form.lat} onChange={(e) => set("lat", e.target.value)} placeholder="7.0086" />
                            </FormField>
                            <FormField label="ลองจิจูด">
                                <input className="field tabular font-mono text-xs" inputMode="decimal" value={form.lng} onChange={(e) => set("lng", e.target.value)} placeholder="100.4986" />
                            </FormField>
                        </div>
                        {show("coords") ? <p className="text-xs text-negative">{show("coords")}</p> : !hasCoords && <p className="text-xs text-warning">ยังไม่ได้ปักหมุด — ห้องนี้จะไม่แสดงบนแผนที่</p>}
                    </Section>

                    <Section title="รูปภาพ" description={isEdit ? "รูปใหม่จะต่อท้ายรูปเดิม" : "รูปแรกจะเป็นรูปปก"} bodyClassName="p-4">
                        <ImageUploader value={form.images} onChange={(v) => set("images", v)} reorderable={!isEdit} />
                    </Section>
                    {isEdit && prayerRoomToEdit && <RevisionHistory type="prayer-rooms" id={prayerRoomToEdit._id} />}
                </aside>
            </form>
        </>
    );
}
