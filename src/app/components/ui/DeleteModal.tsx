"use client";

import { useEffect } from "react";
import { Loader2, Trash2, X } from "lucide-react";

interface DeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    itemName?: string;
    isDeleting: boolean;
    confirmText?: string;
    cancelText?: string;
    /** ลบแบบย้ายไปถังขยะ (กู้คืนได้ 30 วัน) */
    recoverable?: boolean;
}

export default function DeleteModal({
    isOpen,
    onClose,
    onConfirm,
    title = "ยืนยันการลบ",
    description,
    itemName,
    isDeleting,
    confirmText = "ยืนยันลบ",
    cancelText = "ยกเลิก",
    recoverable = false,
}: DeleteModalProps) {
    useEffect(() => {
        if (!isOpen) return;
        const esc = (e: KeyboardEvent) => e.key === "Escape" && !isDeleting && onClose();
        window.addEventListener("keydown", esc);
        return () => window.removeEventListener("keydown", esc);
    }, [isOpen, isDeleting, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
            <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" aria-hidden="true" onClick={isDeleting ? undefined : onClose} />

            <div className="animate-in relative w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-surface shadow-pop">
                <button type="button" aria-label="ปิด" onClick={onClose} disabled={isDeleting} className="absolute top-4 right-4 grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-50">
                    <X size={18} />
                </button>

                <div className="p-6 text-center">
                    <div className="mx-auto mb-5 grid size-16 place-items-center rounded-3xl bg-negative-soft">
                        <Trash2 className="size-7 text-negative" />
                    </div>
                    <h3 id="delete-title" className="mb-2 text-lg font-bold text-fg">{title}</h3>
                    <p className="mb-6 text-sm leading-relaxed text-muted">
                        {description}
                        {itemName && (
                            <>
                                <br />
                                <span className="font-semibold text-fg">&ldquo;{itemName}&rdquo;</span>
                                {!recoverable && (
                                    <>
                                        <br />
                                        การกระทำนี้ไม่สามารถย้อนกลับได้
                                    </>
                                )}
                            </>
                        )}
                        {recoverable && <span className="mt-2 block rounded-xl bg-surface-2 px-3 py-2 text-xs">ย้ายไปถังขยะ — กู้คืนได้ภายใน 30 วัน</span>}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={onClose} disabled={isDeleting} className="btn-secondary">
                            {cancelText}
                        </button>
                        <button type="button" onClick={onConfirm} disabled={isDeleting} className="btn bg-negative text-white shadow-[0_8px_20px_rgba(220,38,38,0.22)] hover:opacity-90">
                            {isDeleting ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" /> กำลังลบ…
                                </>
                            ) : (
                                recoverable && confirmText === "ยืนยันลบ" ? "ย้ายไปถังขยะ" : confirmText
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
