"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Clock, MapPin, Star, Users } from "lucide-react";
import type { ActivityListItem } from "@/types/activity";
import { activityService } from "@/services/activityService";
import { FormHeader } from "@/app/components/ui/FormHeader";
import { FormSkeleton } from "@/app/components/ui/FormSkeleton";
import { Section, Switch } from "@/app/components/ui/kit";
import { FormField, ImageUploader, ListEditor, fromLocalInput, splitImages, toLocalInput } from "@/app/components/ui/form";
import { PublishControl, publishError, publishFromDoc, publishPayload, type PublishValue } from "@/app/components/content/PublishControl";
import { RevisionHistory } from "@/app/components/content/RevisionHistory";
import { toastUtils } from "@/lib/toast";
import { handleApiError } from "@/lib/axios";
import { cn } from "@/lib/utils";

const MAX_FAVORITES = 4;

type State = {
    name_th: string;
    name_eng: string;
    location: string;
    description: string;
    participants: string;
    start: string;
    end: string;
    images: (string | File)[];
    objectives: string[];
    goals: string[];
    favorite: boolean;
};

const EMPTY: State = { name_th: "", name_eng: "", location: "", description: "", participants: "", start: "", end: "", images: [], objectives: [""], goals: [""], favorite: false };

/** ข้อมูลเก่าบางรายการเก็บ array เป็นสตริง JSON ที่ถูกตัดตามจุลภาค — รวมกลับให้ถูก */
function fixList(list?: string[]): string[] {
    if (!list?.length) return [""];
    if (list[0]?.startsWith("[")) {
        try {
            const parsed = JSON.parse(list.join(","));
            if (Array.isArray(parsed)) return parsed.map(String);
        } catch {
            /* ใช้ค่าเดิม */
        }
    }
    return list;
}

function durationText(start: string, end: string) {
    if (!start || !end) return null;
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (Number.isNaN(ms)) return null;
    if (ms < 0) return "invalid";
    const h = Math.floor(ms / 3600000);
    const d = Math.floor(h / 24);
    const rem = h % 24;
    const m = Math.round((ms % 3600000) / 60000);
    return d ? `${d} วัน${rem ? ` ${rem} ชั่วโมง` : ""}` : `${h} ชั่วโมง${m ? ` ${m} นาที` : ""}`;
}

export default function ActivityForm({ activityToEdit, currentFavoriteCount }: { activityToEdit?: ActivityListItem | null; currentFavoriteCount: number }) {
    const isEdit = !!activityToEdit;
    const router = useRouter();
    const [form, setForm] = useState<State>(EMPTY);
    const [publish, setPublish] = useState<PublishValue>({ state: "published", at: "" });
    const [original, setOriginal] = useState<string[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [touched, setTouched] = useState(false);

    useEffect(() => {
        if (!activityToEdit) return;
        activityService
            .getById(activityToEdit._id)
            .then((d) => {
                setOriginal(d.images ?? []);
                setForm({
                    name_th: d.name_th ?? "",
                    name_eng: d.name_eng ?? "",
                    location: d.location ?? "",
                    description: d.description ?? "",
                    participants: d.participants ? String(d.participants) : "",
                    start: toLocalInput(d.start_date),
                    end: toLocalInput(d.end_date),
                    images: d.images ?? [],
                    objectives: fixList(d.objectives),
                    goals: fixList(d.goals),
                    favorite: !!d.favorite,
                });
                setPublish(publishFromDoc(d, toLocalInput));
            })
            .catch((e) => toastUtils.error("โหลดข้อมูลกิจกรรมไม่สำเร็จ", handleApiError(e)))
            .finally(() => setLoadingDetail(false));
    }, [activityToEdit]);

    const set = <K extends keyof State>(k: K, v: State[K]) => setForm((f) => ({ ...f, [k]: v }));
    const duration = durationText(form.start, form.end);
    // เปิด "แนะนำ" ใหม่ได้เมื่อยังไม่เต็มโควตา (รายการที่แนะนำอยู่แล้วแก้ไขได้เสมอ)
    const favoriteFull = !activityToEdit?.favorite && currentFavoriteCount >= MAX_FAVORITES;

    const errors = useMemo(
        () => ({
            name_th: !form.name_th.trim() ? "กรุณากรอกชื่อกิจกรรม" : "",
            start: !form.start ? "กรุณาเลือกวันเวลาเริ่ม" : "",
            end: !form.end ? "กรุณาเลือกวันเวลาสิ้นสุด" : duration === "invalid" ? "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม" : "",
            participants: form.participants && (!/^\d+$/.test(form.participants) || Number(form.participants) > 100000) ? "ใส่เป็นตัวเลขจำนวนคน" : "",
            favorite: form.favorite && favoriteFull ? `แนะนำได้สูงสุด ${MAX_FAVORITES} กิจกรรม — ยกเลิกแนะนำกิจกรรมอื่นก่อน` : "",
            publish: publishError(publish),
        }),
        [form, duration, favoriteFull, publish],
    );
    const show = (k: keyof typeof errors) => (touched ? errors[k] : "");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(true);
        if (Object.values(errors).some(Boolean)) {
            toastUtils.warning("ข้อมูลไม่ครบถ้วน", "กรุณาตรวจสอบช่องที่มีเครื่องหมายแจ้งเตือน");
            return;
        }
        setSaving(true);
        const clean = (l: string[]) => l.map((s) => s.trim()).filter(Boolean);
        const base = {
            name_th: form.name_th.trim(),
            name_eng: form.name_eng.trim(),
            location: form.location.trim(),
            description: form.description.trim(),
            participants: form.participants ? Number(form.participants) : 0,
            start_date: fromLocalInput(form.start),
            end_date: fromLocalInput(form.end),
            favorite: form.favorite,
            // JSON array: ข้อความที่มีจุลภาคไม่ถูกแยกเป็นหลายข้อ
            objectives: JSON.stringify(clean(form.objectives)),
            goals: JSON.stringify(clean(form.goals)),
            ...publishPayload(publish),
        };
        const { files, libraryUrls, removed } = splitImages(form.images, original);
        try {
            if (isEdit && activityToEdit) {
                await activityService.update(activityToEdit._id, { ...base, image_urls: JSON.stringify(libraryUrls) }, files, removed);
                toastUtils.success("บันทึกแล้ว", "แก้ไขกิจกรรมเรียบร้อย");
            } else {
                const fd = new FormData();
                Object.entries(base).forEach(([k, v]) => fd.append(k, String(v)));
                fd.append("image_urls", JSON.stringify(libraryUrls));
                files.forEach((f) => fd.append("images", f));
                await activityService.create(fd);
                toastUtils.success("เพิ่มกิจกรรมแล้ว", "กิจกรรมจะแสดงบนเว็บไซต์ทันที");
            }
            router.push("/admin/activity");
        } catch (err) {
            toastUtils.error("บันทึกไม่สำเร็จ", handleApiError(err));
            setSaving(false);
        }
    };

    if (loadingDetail) return <FormSkeleton />;

    return (
        <>
            <FormHeader
                title={isEdit ? `แก้ไข: ${form.name_th || "กิจกรรม"}` : "เพิ่มกิจกรรมใหม่"}
                description={isEdit ? "แก้ไขรายละเอียด วันเวลา และรูปภาพของกิจกรรม" : "กรอกข้อมูลกิจกรรมเพื่อแสดงบนเว็บไซต์"}
                backUrl="/admin/activity"
                formId="activity-form"
                isLoading={saving}
                saveLabel={isEdit ? "บันทึกการแก้ไข" : "บันทึกกิจกรรม"}
            />

            <form id="activity-form" onSubmit={submit} noValidate className="grid w-full grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
                <div className="min-w-0 space-y-5">
                    <Section title="ข้อมูลกิจกรรม" bodyClassName="space-y-4 p-5 sm:p-6">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField label="ชื่อกิจกรรม (ไทย)" required error={show("name_th")}>
                                <input className="field" value={form.name_th} maxLength={200} onChange={(e) => set("name_th", e.target.value)} placeholder="เช่น ค่ายฟื้นฟูอีหม่าน ครั้งที่ 12" />
                            </FormField>
                            <FormField label="ชื่อกิจกรรม (อังกฤษ)" hint="ใช้สร้างลิงก์ (URL) ของกิจกรรม">
                                <input className="field" value={form.name_eng} maxLength={200} onChange={(e) => set("name_eng", e.target.value)} placeholder="e.g. Iman Camp 12" />
                            </FormField>
                        </div>
                        <FormField label="สถานที่">
                            <div className="relative">
                                <MapPin className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                                <input className="field pl-10" value={form.location} maxLength={200} onChange={(e) => set("location", e.target.value)} placeholder="เช่น หอประชุมเฉลิมพระเกียรติ ม.อ." />
                            </div>
                        </FormField>
                        <FormField label="รายละเอียด" hint={`${form.description.length.toLocaleString()} ตัวอักษร`}>
                            <textarea className="field min-h-36 leading-relaxed" rows={6} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="เล่าว่ากิจกรรมนี้ทำอะไร เหมาะกับใคร และจะได้อะไร" />
                        </FormField>
                    </Section>

                    <Section title="วัตถุประสงค์และเป้าหมาย" bodyClassName="grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-2">
                        <div>
                            <p className="label">วัตถุประสงค์</p>
                            <ListEditor value={form.objectives} onChange={(v) => set("objectives", v)} placeholder="เช่น เพื่อเสริมสร้างความสัมพันธ์" addLabel="เพิ่มวัตถุประสงค์" />
                        </div>
                        <div>
                            <p className="label">เป้าหมาย</p>
                            <ListEditor value={form.goals} onChange={(v) => set("goals", v)} placeholder="เช่น ผู้เข้าร่วม 100 คน" addLabel="เพิ่มเป้าหมาย" />
                        </div>
                    </Section>
                </div>

                <aside className="min-w-0 space-y-5 xl:sticky xl:top-4 xl:self-start">
                    <PublishControl value={publish} onChange={setPublish} error={show("publish")} />
                    <Section title="วันเวลา" bodyClassName="space-y-4 p-5">
                        <FormField label="เริ่ม" required error={show("start")}>
                            <input type="datetime-local" className="field" value={form.start} onChange={(e) => set("start", e.target.value)} />
                        </FormField>
                        <FormField label="สิ้นสุด" required error={show("end")}>
                            <input type="datetime-local" className="field" value={form.end} min={form.start || undefined} onChange={(e) => set("end", e.target.value)} />
                        </FormField>
                        <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm", duration === "invalid" ? "bg-negative-soft text-negative" : "bg-surface-2 text-fg-2")}>
                            <Clock className="size-4 shrink-0" />
                            {duration === "invalid" ? "เวลาสิ้นสุดอยู่ก่อนเวลาเริ่ม" : duration ? <>ระยะเวลา <b>{duration}</b> (คำนวณอัตโนมัติ)</> : "เลือกวันเวลาเพื่อคำนวณระยะเวลา"}
                        </div>
                        <FormField label="จำนวนผู้เข้าร่วม (คน)" error={show("participants")}>
                            <div className="relative">
                                <Users className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                                <input className="field tabular pl-10" inputMode="numeric" value={form.participants} onChange={(e) => set("participants", e.target.value.replace(/\D/g, ""))} placeholder="0" />
                            </div>
                        </FormField>
                    </Section>

                    <Section title="การแสดงผล" bodyClassName="p-5">
                        <label className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-colors", form.favorite ? "border-warning/40 bg-warning-soft" : "border-line hover:bg-surface-2", favoriteFull && !form.favorite && "cursor-not-allowed opacity-60")}>
                            <Star className={cn("size-5 shrink-0", form.favorite ? "fill-warning text-warning" : "text-muted")} />
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-bold text-fg">แนะนำกิจกรรมนี้</span>
                                <span className="block text-xs text-muted">
                                    แสดงในหน้าแรกของเว็บไซต์ · ใช้ไป {currentFavoriteCount - (activityToEdit?.favorite ? 1 : 0) + (form.favorite ? 1 : 0)}/{MAX_FAVORITES}
                                </span>
                            </span>
                            <Switch checked={form.favorite} onChange={(v) => set("favorite", v)} label="แนะนำกิจกรรมนี้" disabled={favoriteFull && !form.favorite} />
                        </label>
                        {show("favorite") && <p className="mt-2 text-xs text-negative">{show("favorite")}</p>}
                    </Section>

                    <Section title="รูปภาพ" description={isEdit ? "รูปใหม่จะต่อท้ายรูปเดิม" : "รูปแรกจะเป็นรูปปก"} bodyClassName="p-4">
                        <ImageUploader value={form.images} onChange={(v) => set("images", v)} reorderable={!isEdit} />
                    </Section>

                    {isEdit && activityToEdit && <RevisionHistory type="activities" id={activityToEdit._id} />}
                    {isEdit && (
                        <p className="flex items-center gap-1.5 px-1 text-xs text-muted">
                            <CalendarClock className="size-3.5" /> เวลาที่แสดงเป็นเวลาไทย (ตามเครื่องของคุณ)
                        </p>
                    )}
                </aside>
            </form>
        </>
    );
}
