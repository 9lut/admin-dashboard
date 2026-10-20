"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormHeaderProps {
  title: string;
  backUrl: string;
  formId: string;
  isLoading?: boolean;
  saveLabel?: string;
  description?: string;
}

/** หัวฟอร์ม + ปุ่มบันทึกลอย (โผล่เมื่อเลื่อนลง ฟอร์มยาวไม่ต้องเลื่อนกลับขึ้นไปกด) */
export function FormHeader({ title, backUrl, formId, isLoading = false, saveLabel = "บันทึกข้อมูล", description }: FormHeaderProps) {
  const [floating, setFloating] = useState(false);

  useEffect(() => {
    const onScroll = () => setFloating(window.scrollY > 180);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const save = (cls: string) => (
    <button type="submit" form={formId} disabled={isLoading} className={cls}>
      {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
      <span>{isLoading ? "กำลังบันทึก…" : saveLabel}</span>
    </button>
  );

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link href={backUrl} className="mb-1 inline-flex items-center gap-1 text-xs font-bold text-muted transition-colors hover:text-primary">
            <ChevronLeft className="size-4" /> ย้อนกลับ
          </Link>
          <h1 className="truncate text-xl font-bold tracking-tight text-fg sm:text-2xl">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Link href={backUrl} className="btn-secondary" aria-disabled={isLoading}>
            ยกเลิก
          </Link>
          {save("btn-primary")}
        </div>
      </div>

      <div
        className={cn(
          "fixed right-4 bottom-24 z-30 transition-all duration-300 lg:right-8 lg:bottom-8",
          floating ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
        )}
        aria-hidden={!floating}
        inert={!floating}
      >
        {save("btn-primary h-12 rounded-2xl px-5 shadow-pop")}
      </div>
    </>
  );
}
