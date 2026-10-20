import Link from "next/link";
import { ChevronLeft, Plus, type LucideIcon } from "lucide-react";
import { Illustration } from "@/app/components/brand/Illustration";

interface PageHeaderProps {
    title: string;
    description?: React.ReactNode;
    /** ข้อความเล็กเหนือหัวข้อ (เช่น วันที่) */
    eyebrow?: string;
    /** ลิงก์ย้อนกลับเหนือหัวข้อ */
    back?: { href: string; label: string };
    /** ภาพประกอบเวกเตอร์ข้างหัวข้อ (ชื่อใน illustrations.ts) */
    art?: string;
    /** @deprecated ใช้ art แทน — เก็บไว้ให้หน้าเดิมยังเรียกได้ */
    icon?: LucideIcon;
    /** @deprecated สีมาจากธีมแล้ว */
    colorClass?: string;
    action?: {
        label: string;
        icon?: LucideIcon;
        onClick?: () => void;
        href?: string;
    };
    /** ปุ่ม/ตัวควบคุมเพิ่มเติมด้านขวา */
    children?: React.ReactNode;
}

/** หัวข้อหน้าในแผงเนื้อหาสีขาว: ชื่อหน้า + คำอธิบาย ซ้าย · ปุ่มขวา */
export function PageHeader({ title, description, eyebrow, back, art, action, children }: PageHeaderProps) {
    const ActionIcon = action?.icon || Plus;
    const actionBody = (
        <>
            <ActionIcon className="size-4" />
            <span className="sm:hidden">เพิ่ม</span>
            <span className="hidden sm:inline">{action?.label}</span>
        </>
    );

    return (
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3.5">
                {art && (
                    <span className="hidden size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft sm:grid">
                        <Illustration name={art} className="size-10" />
                    </span>
                )}
                <div className="min-w-0">
                    {back && (
                        <Link href={back.href} className="mb-1 inline-flex items-center gap-1 text-xs font-bold text-muted transition-colors hover:text-primary">
                            <ChevronLeft className="size-4" /> {back.label}
                        </Link>
                    )}
                    {eyebrow && !back && <p className="mb-0.5 text-xs font-bold text-primary">{eyebrow}</p>}
                    <h1 className="truncate text-xl font-bold tracking-tight text-fg sm:text-2xl">{title}</h1>
                    {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
                </div>
            </div>

            {(action || children) && (
                <div className="flex flex-wrap items-center gap-2">
                    {children}
                    {action &&
                        (action.href ? (
                            <Link href={action.href} className="btn-primary">
                                {actionBody}
                            </Link>
                        ) : (
                            <button type="button" onClick={action.onClick} className="btn-primary">
                                {actionBody}
                            </button>
                        ))}
                </div>
            )}
        </div>
    );
}
