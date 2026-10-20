"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  Save,
  Loader2,
  Image as ImageIcon,
  Trash2,
  Eye,
  Languages,
  AlertCircle,
  Globe,
  PencilOff,
} from "lucide-react";
import { BlogGroup, BlogContentBlock } from "@/types/blog";
import { blogService } from "@/services/blogService";
import { useToast } from "@/hooks/use-toast";
import { generateSlugFromThai } from "@/lib/translateSlug";
import Link from "next/link";
import Image from "next/image";
import BlogBlockEditor from "./BlogBlockEditor";
import TagInput from "./TagInput";
import BlogPreview from "./BlogPreview";
import GroupSelector from "./GroupSelector";
import { Button } from "@/app/components/ui/button";

interface BlogFormProps {
  mode: "create" | "edit";
  initialData?: {
    id?: string;
    title?: string;
    slug?: string;
    description?: string;
    group?: string;
    tags?: string[];
    coverImage?: string;
    content?: BlogContentBlock[];
    status?: "draft" | "published";
    series?: { name: string; order: number };
    referenceUrl?: string;
    views?: number;
  };
  groups: BlogGroup[];
  onGroupCreated: (group: BlogGroup) => void;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export default function BlogForm({
  mode,
  initialData,
  groups,
  onGroupCreated,
  onSubmit,
  onCancel,
}: BlogFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Form State
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [selectedGroup, setSelectedGroup] = useState(initialData?.group || "");
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [coverImage, setCoverImage] = useState(initialData?.coverImage || "");
  const [content, setContent] = useState<BlogContentBlock[]>(
    initialData?.content || [{ type: "paragraph", data: "" }],
  );
  const [isUploading, setIsUploading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [status, setStatus] = useState<"draft" | "published">(
    initialData?.status || "draft",
  );
  const [seriesName, setSeriesName] = useState(initialData?.series?.name || "");
  const [seriesOrder, setSeriesOrder] = useState<number | "">(
    initialData?.series?.order || "",
  );
  const [referenceUrl, setReferenceUrl] = useState(
    initialData?.referenceUrl || "",
  );

  const [hasDraft, setHasDraft] = useState(false);
  const DRAFT_KEY = mode === "create" ? "blog_draft_new" : `blog_draft_${initialData?.id || "unknown"}`;
  
  const [deletedImages, setDeletedImages] = useState<string[]>([]);
  const isDirty = useMemo(() => {
    if (mode === "create") {
      return title !== "" || content.length > 1 || !!(content[0].type === "paragraph" && content[0].data);
    }
    if (!initialData) return false;

    return (
      title !== (initialData.title || "") ||
      slug !== (initialData.slug || "") ||
      description !== (initialData.description || "") ||
      selectedGroup !== (initialData.group || "") ||
      coverImage !== (initialData.coverImage || "") ||
      status !== (initialData.status || "draft") ||
      seriesName !== (initialData.series?.name || "") ||
      String(seriesOrder) !== String(initialData.series?.order || "") ||
      referenceUrl !== (initialData.referenceUrl || "") ||
      JSON.stringify(tags) !== JSON.stringify(initialData.tags || []) ||
      JSON.stringify(content) !== JSON.stringify(initialData.content || [])
    );
  }, [title, slug, description, selectedGroup, tags, coverImage, status, seriesName, seriesOrder, referenceUrl, content, initialData, mode]);

  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        if (mode === "edit" && initialData) {
           const parsedDraft = JSON.parse(draft);
           // If draft is same as initialData (check title and description as basic heuristic)
           if (parsedDraft.title === (initialData.title || "") && parsedDraft.description === (initialData.description || "")) {
              localStorage.removeItem(DRAFT_KEY);
              return;
           }
        }
        setHasDraft(true);
      }
    } catch (e) {
      console.error("Failed to check draft", e);
    }
  }, [DRAFT_KEY, mode, initialData]);

  useEffect(() => {
    if (isDirty) {
      const draftData = {
        title, slug, description, group: selectedGroup, tags, coverImage, content, status,
        series: { name: seriesName, order: seriesOrder }, referenceUrl,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    }
  }, [isDirty, title, slug, description, selectedGroup, tags, coverImage, content, status, seriesName, seriesOrder, referenceUrl, DRAFT_KEY]);

  const loadDraft = () => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        const parsedDraft = JSON.parse(draft);
        setTitle(parsedDraft.title || "");
        setSlug(parsedDraft.slug || "");
        setDescription(parsedDraft.description || "");
        setSelectedGroup(parsedDraft.group || "");
        setTags(parsedDraft.tags || []);
        setCoverImage(parsedDraft.coverImage || "");
        setContent(parsedDraft.content || [{ type: "paragraph", data: "" }]);
        setStatus(parsedDraft.status || "draft");
        setSeriesName(parsedDraft.series?.name || "");
        setSeriesOrder(parsedDraft.series?.order || "");
        setReferenceUrl(parsedDraft.referenceUrl || "");
        
        setHasDraft(false);
        toast({ title: "สำเร็จ", description: "กู้คืนข้อมูลแบบร่างเรียบร้อยแล้ว", variant: "default" });
      }
    } catch (e) {
      toast({ title: "ผิดพลาด", description: "ไม่สามารถกู้คืนข้อมูลได้", variant: "destructive" });
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
  };

  // Auto-generate slug from title (only for create mode)
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (mode === "create") {
      const hasThai = /[\u0E00-\u0E7F]/.test(newTitle);
      if (!hasThai) {
        const generatedSlug = newTitle
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9\-]/g, "")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");
        setSlug(generatedSlug);
      }
    }
  };

  const handleSlugChange = (value: string) => {
    const validSlug = value.toLowerCase().replace(/[^a-z0-9\-]/g, "");
    setSlug(validSlug);
  };

  const handleGenerateSlug = async () => {
    if (!title.trim()) return;
    setTranslating(true);
    try {
      const generatedSlug = await generateSlugFromThai(title);
      setSlug(generatedSlug);
      toast({
        title: "สำเร็จ",
        description: "สร้าง slug จากการแปลหัวข้อเรียบร้อย",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "ผิดพลาด",
        description: error.message || "ไม่สามารถแปลหัวข้อได้",
        variant: "destructive",
      });
    } finally {
      setTranslating(false);
    }
  };



  const handleCoverImageUpload = async (file: File) => {
    const allowedTypes = ["image/webp", "image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "ไฟล์ไม่รองรับ",
        description: "กรุณาเลือกไฟล์ .webp, .jpg หรือ .png เท่านั้น",
        variant: "destructive",
      });
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "ไฟล์ใหญ่เกินไป",
        description: "กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const result = await blogService.uploadImage(file);
      if (coverImage) {
        setDeletedImages(prev => [...prev, coverImage]);
      }
      setCoverImage(result.url);
      toast({
        title: "สำเร็จ",
        description: "อัปโหลดรูปปกเรียบร้อย",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "อัปโหลดรูปปกไม่สำเร็จ",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !selectedGroup) {
      toast({
        title: "ข้อมูลไม่ครบ",
        description: "กรุณากรอกหัวข้อและเลือกหมวดหมู่",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const blogData = {
        title,
        slug,
        description,
        group: selectedGroup,
        tags,
        coverImage,
        content,
        status,
        series: seriesName.trim()
          ? { name: seriesName.trim(), order: Number(seriesOrder) || 1 }
          : null,
        referenceUrl,
        ...(deletedImages.length > 0 ? { deletedImages } : {})
      };

      await onSubmit(blogData);
      localStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      // Error already handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showPreview && (
        <BlogPreview
          blocks={content}
          title={title}
          coverImage={coverImage}
          onClose={() => setShowPreview(false)}
        />
      )}

      <form
        onSubmit={handleSubmit}
        className="w-full space-y-4 md:space-y-6"
      >
        {/* Autosave Alert */}
        {hasDraft && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4 transition-all">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-lg text-amber-600 dark:text-amber-400">
                <Save size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">พบข้อมูลที่บันทึกอัตโนมัติ</h4>
                <p className="text-xs text-amber-600 dark:text-amber-400/80">ระบบพบข้อมูลที่คุณพิมพ์ค้างไว้ ต้องการกู้คืนหรือไม่?</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" size="sm" onClick={clearDraft} className="flex-1 sm:flex-none border-amber-200 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/50">ลบทิ้ง</Button>
              <Button type="button" size="sm" onClick={loadDraft} className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-600 text-white">กู้คืนข้อมูล</Button>
            </div>
          </div>
        )}

        {/* Header - Mobile Optimized */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-5">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/admin/blog/content"
              className="grid size-10 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-primary-soft hover:text-primary" aria-label="ย้อนกลับ"
            >
              <ChevronLeft size={20} />
            </Link>
            <div className="min-w-0 flex-1 ">
              <h1 className="truncate text-xl font-bold tracking-tight text-fg sm:text-2xl">
                {mode === "create" ? "สร้างบทความใหม่" : "แก้ไขบทความ"}
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                {mode === "create"
                  ? "เพิ่มเนื้อหาและรายละเอียด"
                  : "อัปเดตเนื้อหาและรายละเอียด"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button type="button" onClick={() => setShowPreview(true)} className="btn-secondary flex-1 sm:flex-none">
              <Eye size={16} />
              <span>ดูตัวอย่าง</span>
            </button>
            <button type="button" onClick={onCancel} className="btn-ghost flex-1 sm:flex-none">
              ยกเลิก
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 sm:flex-none">
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Save size={18} />
              )}
              <span>
                {mode === "create" ? "บันทึกบทความ" : "บันทึกการแก้ไข"}
              </span>
            </button>
          </div>
        </div>

        {/* Desktop: 2 Column Layout | Mobile: Stack Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full max-w-full">
          {/* Left Column: Main Content (Desktop 2/3 width) */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Title */}
            <div className="bg-surface p-4 md:p-6 rounded-xl md:rounded-2xl border border-line shadow-sm">
              <label className="block text-sm font-bold text-fg-2 mb-2">
                หัวข้อบทความ *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="ใส่หัวข้อบทความที่น่าสนใจ..."
                className="w-full text-lg md:text-xl font-bold px-4 py-3 bg-surface-2 border border-line rounded-xl outline-none focus:ring-2 focus:ring-sky-500 transition-all placeholder:font-normal"
                required
              />
            </div>

            {/* Slug Field */}
            <div className="bg-surface p-4 md:p-6 rounded-xl md:rounded-2xl border border-line shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-fg-2">
                  Slug (URL) *
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {mode === "create"
                      ? "Auto-generated จากหัวข้อ"
                      : "ระวัง! การเปลี่ยน slug จะทำให้ URL เก่าไม่สามารถเข้าถึงได้"}
                  </span>
                </label>
                {/[\u0E00-\u0E7F]/.test(title) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateSlug}
                    disabled={translating || !title.trim()}
                    className="gap-1.5 text-xs h-7 px-2.5 border-sky-200 text-sky-600 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-400 dark:hover:bg-sky-950 flex-shrink-0"
                  >
                    {translating ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <Languages size={14} />
                    )}
                    แปลเป็น Slug
                  </Button>
                )}
              </div>
              <input
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="my-blog-post-slug"
                className="field font-mono"
                required
              />
              <p className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                <AlertCircle size={14} />
                URL: <span className="text-sky-500">/blog/{slug || "..."}</span>
              </p>
            </div>

            {/* Content Editor */}
            <BlogBlockEditor 
              blocks={content} 
              onChange={setContent} 
              onImageDelete={(url) => setDeletedImages(prev => [...prev, url])}
            />
          </div>

          {/* Right Column: Settings & Metadata (Desktop 1/3 width) */}
          <div className="space-y-4 md:space-y-6">
            {/* Cover Image */}
            <div className="bg-surface p-4 md:p-5 rounded-xl md:rounded-2xl border border-line shadow-sm">
              <label className="block text-sm font-bold text-fg-2 mb-3">
                รูปปก (Cover Image)
              </label>
              {coverImage ? (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-line group">
                  <Image
                    src={coverImage}
                    alt="Cover"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      type="button"
                      onClick={() => {
                        if (coverImage) setDeletedImages(prev => [...prev, coverImage]);
                        setCoverImage("");
                      }}
                      className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-rose-500 transition-colors"
                    >
                      <Trash2 size={20} />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-video border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:bg-surface-2 transition-colors relative cursor-pointer">
                  {isUploading ? (
                    <Loader2 className="animate-spin text-sky-500" size={32} />
                  ) : (
                    <>
                      <ImageIcon size={32} className="mb-2" />
                      <span className="text-sm text-center">
                        แตะเพื่ออัปโหลดรูปปก
                      </span>
                      <span className="text-xs text-slate-400 mt-1">
                        รองรับ WebP, JPG, PNG (สูงสุด 5MB)
                      </span>
                      <input
                        type="file"
                        accept="image/webp,image/jpeg,image/jpg,image/png"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) =>
                          e.target.files?.[0] &&
                          handleCoverImageUpload(e.target.files[0])
                        }
                      />
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Settings Card */}
            <div className="bg-surface p-4 md:p-5 rounded-xl md:rounded-2xl border border-line shadow-sm space-y-4">
              {/* Views (Edit mode only) */}
              {mode === "edit" && initialData?.views !== undefined && (
                <div className="flex items-center justify-between py-2 px-3 bg-surface-2 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Eye size={16} className="text-sky-500" />
                    <span className="font-medium">ยอดเข้าชม</span>
                  </div>
                  <span className="text-lg font-bold text-sky-600 dark:text-sky-400 font-mono">
                    {initialData.views.toLocaleString()}
                  </span>
                </div>
              )}

              {/* Status Toggle */}
              <div>
                <label className="block text-sm font-bold text-fg-2 mb-2">
                  สถานะ
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => setStatus("draft")}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      status === "draft"
                        ? "bg-amber-100 text-amber-700 border-2 border-amber-400 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-600"
                        : "bg-slate-50 text-slate-500 border-2 border-transparent hover:bg-surface-2 dark:text-slate-400"
                    }`}
                  >
                    <PencilOff size={16} />
                    Draft
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setStatus("published")}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      status === "published"
                        ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-400 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-600"
                        : "bg-slate-50 text-slate-500 border-2 border-transparent hover:bg-surface-2 dark:text-slate-400"
                    }`}
                  >
                    <Globe size={16} />
                    Published
                  </Button>
                </div>
                <p className="mt-1.5 text-[10px] text-slate-400">
                  {status === "draft"
                    ? "บทความจะยังไม่แสดงบนหน้าเว็บ"
                    : "บทความจะแสดงบนหน้าเว็บทันที"}
                </p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-bold text-fg-2 mb-2">
                  หมวดหมู่ *
                </label>
                <GroupSelector
                  groups={groups}
                  value={selectedGroup}
                  onChange={setSelectedGroup}
                  onGroupCreated={onGroupCreated}
                />
              </div>

              {/* Series */}
              <div className="space-y-3 p-4 bg-surface-2 rounded-xl border border-line">
                <label className="block text-sm font-bold text-fg-2">
                  ซีรีส์บทความ (Series){" "}
                  <span className="text-xs font-normal text-slate-400 ml-1">
                    (ทางเลือก)
                  </span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={seriesName}
                      onChange={(e) => setSeriesName(e.target.value)}
                      placeholder="ชื่อซีรีส์ เช่น ซีรีส์อัตเตาฮีด"
                      className="field"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      min="1"
                      value={seriesOrder}
                      onChange={(e) =>
                        setSeriesOrder(
                          e.target.value ? Number(e.target.value) : "",
                        )
                      }
                      placeholder="ตอนที่"
                      className="field text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Reference URL */}
              <div>
                <label className="block text-sm font-bold text-fg-2 mb-2">
                  ลิงก์อ้างอิงต้นฉบับ (Reference URL){" "}
                  <span className="text-xs font-normal text-slate-400 ml-1">
                    (ทางเลือก)
                  </span>
                </label>
                <input
                  type="url"
                  value={referenceUrl}
                  onChange={(e) => setReferenceUrl(e.target.value)}
                  placeholder="เช่น https://www.facebook.com/..."
                  className="field"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-fg-2 mb-2">
                  คำอธิบายย่อ
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="field resize-none"
                  placeholder="คำโปรยสั้นๆ..."
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-bold text-fg-2 mb-2">
                  Tags
                </label>
                <TagInput
                  tags={tags}
                  onChange={setTags}
                  placeholder="พิมพ์ tag เช่น อิสลาม, ข่าวสาร..."
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
