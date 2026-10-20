import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Illustration } from "@/app/components/brand/Illustration";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  /** ภาพประกอบเวกเตอร์แทนไอคอน */
  art?: string;
  /** ข้อความใต้ตัวเลข (ป้ายเล็ก) */
  hint?: string;
  /** ลิงก์ "ดูทั้งหมด" ท้ายการ์ด */
  href?: string;
}

/** การ์ดตัวเลข: ภาพประกอบ + ชื่อ · ตัวเลขใหญ่ · ป้าย · ลิงก์ท้ายการ์ด */
export const StatsCard = ({ label, value, icon: Icon, art, hint, href }: StatsCardProps) => (
  <div className="animate-in flex flex-col rounded-2xl border border-line bg-surface p-4 shadow-card transition-shadow hover:shadow-pop">
    <div className="flex items-center gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
        {art ? <Illustration name={art} className="size-9" /> : Icon && <Icon className="size-5" strokeWidth={2.2} />}
      </span>
      <p className="min-w-0 text-sm leading-tight font-bold text-fg-2">{label}</p>
    </div>
    <p className="tabular mt-3 font-display text-3xl font-bold tracking-tight text-fg">
      {typeof value === "number" ? value.toLocaleString() : value}
    </p>
    {hint && <span className="mt-1.5 w-fit rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary">{hint}</span>}
    {href && (
      <Link href={href} prefetch={false} className="group mt-3 flex items-center justify-between border-t border-line pt-3 text-xs font-bold text-muted transition-colors hover:text-primary">
        ดูทั้งหมด <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    )}
  </div>
);
