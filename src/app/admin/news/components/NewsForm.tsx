"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2 } from "lucide-react";
import type { News } from "@/types/news";
import { newsService } from "@/services/newsService";
import { FormHeader } from "@/app/components/ui/FormHeader";
import { FormSkeleton } from "@/app/components/ui/FormSkeleton";
import { Section } from "@/app/components/ui/kit";
import { FormField, ImageUploader, fromLocalInput, splitImages, toLocalInput } from "@/app/components/ui/form";
import { PublishControl, publishError, publishFromDoc, publishPayload, type PublishValue } from "@/app/components/content/PublishControl";
import { RevisionHistory } from "@/app/components/content/RevisionHistory";
import { toastUtils } from "@/lib/toast";
import { handleApiError } from "@/lib/axios";

type State = { name: string; description: string; date: string; link: string; images: (string | File)[] };

export default function NewsForm({ newsToEdit }: { newsToEdit?: News | null }) {
    const isEdit = !!newsToEdit;
    const router = useRouter();
    const [form, setForm] = useState<State>({ name: "", description: "", date: toLocalInput(new Date().toISOString()), link: "", images: [] });
    const [publish, setPublish] = useState<PublishValue>({ state: "published", at: "" });
    const [original, setOriginal] = useState<string[]>([]);
    const [source, setSource] = useState<string | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [touched, setTouched] = useState(false);

    useEffect(() => {
        if (!newsToEdit) return;
        newsService
            .getById(newsToEdit._id)
            .then((d) => {
                setOriginal(d.images ?? []);
                setSource(d.source ?? null);
                setForm({ name: d.name ?? "", description: d.description ?? "", date: toLocalInput(d.date), link: d.link ?? "", images: d.images ?? [] });
                setPublish(publishFromDoc(d, toLocalInput));
            })
            .catch((e) => toastUtils.error("โหลดข้อมูลข่าวไม่สำเร็จ", handleApiError(e)))
            .finally(() => setLoadingDetail(false));
    }, [newsToEdit]);

    const set = <K extends keyof State>(k: K, v: State[K]) => setForm((f) => ({ ...f, [k]: v }));
    const errors = useMemo(
        () => ({
            name: !form.name.trim() ? "กรุณากรอกหัวข้อข่าว" : "",
            date: !form.date ? "กรุณาเลือกวันที่ของข่าว" : "",
            link: form.link && !/^https?:\/\//.test(form.link) ? "ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://" : "",
            publish: publishError(publish),
        }),
        [form, publish],
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
        const { files, libraryUrls, removed } = splitImages(form.images, original);
        const base = {
            name: form.name.trim(),
            description: form.description.trim(),
            date: fromLocalInput(form.date),
            link: form.link.trim(),
            ...publishPayload(publish),
            image_urls: JSON.stringify(libraryUrls),
        };
        try {
            if (isEdit && newsToEdit) {
                await newsService.update(newsToEdit._id, base, files, removed);
                toastUtils.success("บันทึกแล้ว", "แก้ไขข่าวเรียบร้อย");
            } else {
                const fd = new FormData();
                Object.entries(base).forEach(([k, v]) => fd.append(k, v));
                files.forEach((f) => fd.append("images", f));
                await newsService.create(fd);
                toastUtils.success(publish.state === "draft" ? "บันทึกร่างแล้ว" : publish.state === "scheduled" ? "ตั้งเวลาเผยแพร่แล้ว" : "เผยแพร่ข่าวแล้ว", "");
            }
            router.push("/admin/news");
        } catch (err) {
            toastUtils.error("บันทึกไม่สำเร็จ", handleApiError(err));
            setSaving(false);
        }
    };

    if (loadingDetail) return <FormSkeleton />;

    const saveLabel = publish.state === "draft" ? "บันทึกร่าง" : publish.state === "scheduled" ? "ตั้งเวลาเผยแพร่" : isEdit ? "บันทึกการแก้ไข" : "เผยแพร่ข่าว";

    return (
        <>
            <FormHeader
                title={isEdit ? `แก้ไข: ${form.name || "ข่าว"}` : "เพิ่มข่าวใหม่"}
                description={source === "facebook" ? "ข่าวนี้ดึงมาจาก Facebook อัตโนมัติ — ตรวจทานก่อนบันทึก" : "ข่าวประชาสัมพันธ์ที่แสดงบนเว็บไซต์"}
                backUrl="/admin/news"
                formId="news-form"
                isLoading={saving}
                saveLabel={saveLabel}
            />

            <form id="news-form" onSubmit={submit} noValidate className="grid w-full grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="min-w-0 space-y-5">
                    <Section title="เนื้อหาข่าว" bodyClassName="space-y-4 p-5 sm:p-6">
                        <FormField label="หัวข้อข่าว" required error={show("name")} hint={`${form.name.length}/200`}>
                            <input className="field" value={form.name} maxLength={200} onChange={(e) => set("name", e.target.value)} placeholder="เช่น ประกาศรับสมัครกรรมการชมรม ปี 2569" />
                        </FormField>
                        <FormField label="รายละเอียด" hint={`${form.description.length.toLocaleString()} ตัวอักษร`}>
                            <textarea className="field min-h-56 leading-relaxed" rows={10} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="รายละเอียดข่าว วัน เวลา สถานที่ และช่องทางติดต่อ" />
                        </FormField>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField label="วันที่ของข่าว" required error={show("date")} hint="ใช้เรียงลำดับและกรองตามเดือน">
                                <input type="datetime-local" className="field" value={form.date} onChange={(e) => set("date", e.target.value)} />
                            </FormField>
                            <FormField label="ลิงก์ภายนอก" error={show("link")} hint="เช่น โพสต์ Facebook หรือฟอร์มสมัคร">
                                <div className="relative">
                                    <Link2 className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                                    <input className="field pl-10" type="url" value={form.link} onChange={(e) => set("link", e.target.value.trim())} placeholder="https://…" />
                                </div>
                            </FormField>
                        </div>
                    </Section>

                    <Section title="รูปภาพ" description="รูปแรกเป็นรูปปกของข่าว" bodyClassName="p-4 sm:p-5">
                        <ImageUploader value={form.images} onChange={(v) => set("images", v)} max={4} reorderable={!isEdit} />
                    </Section>
                </div>

                <aside className="min-w-0 space-y-5 xl:sticky xl:top-4 xl:self-start">
                    <PublishControl value={publish} onChange={setPublish} error={show("publish")} />
                    {isEdit && newsToEdit && <RevisionHistory type="news" id={newsToEdit._id} />}
                </aside>
            </form>
        </>
    );
}
