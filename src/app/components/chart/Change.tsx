import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/** ป้ายเปอร์เซ็นต์เปลี่ยนแปลง (เขียว=เพิ่ม แดง=ลด) */
export function Change({ value, className }: { value: number | null; className?: string }) {
    if (value === null) return <span className={cn("text-xs text-muted", className)}>ไม่มีข้อมูลเทียบ</span>;
    const up = value > 0;
    const Icon = value === 0 ? Minus : up ? ArrowUpRight : ArrowDownRight;
    return (
        <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold", value === 0 ? "bg-surface-2 text-muted" : up ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative", className)}>
            <Icon className="size-3" /> {Math.abs(value)}%
        </span>
    );
}
