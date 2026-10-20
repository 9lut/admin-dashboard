import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (itemsPerPage: number) => void;
}

const SIZES = [10, 12, 20, 24, 50, 100];
const btn = "grid size-8 place-items-center rounded-lg text-fg-2 transition-colors hover:bg-surface-2 hover:text-primary disabled:pointer-events-none disabled:opacity-30";

export function Pagination({ currentPage, totalPages, itemsPerPage, totalItems, onPageChange, onItemsPerPageChange }: PaginationProps) {
    const last = Math.max(totalPages, 1);
    const sizes = SIZES.includes(itemsPerPage) ? SIZES : [...SIZES, itemsPerPage].sort((a, b) => a - b);
    return (
        <div className="flex w-full flex-row items-center justify-between gap-2 lg:w-auto lg:justify-end">
            <label className="flex items-center gap-2 text-xs font-bold text-muted">
                <span className="hidden sm:inline">{totalItems.toLocaleString()} รายการ ·</span> แสดง
                <select
                    value={itemsPerPage}
                    onChange={(e) => {
                        onItemsPerPageChange(Number(e.target.value));
                        onPageChange(1);
                    }}
                    className="cursor-pointer rounded-lg border border-line bg-surface-2 px-2 py-1 text-primary outline-none"
                >
                    {sizes.map((val) => (
                        <option key={val} value={val}>{val}</option>
                    ))}
                </select>
            </label>

            <div className="flex items-center gap-0.5">
                <button type="button" aria-label="หน้าแรก" title="หน้าแรก" disabled={currentPage <= 1} onClick={() => onPageChange(1)} className={btn}>
                    <ChevronsLeft size={16} />
                </button>
                <button type="button" aria-label="หน้าก่อนหน้า" title="หน้าก่อนหน้า" disabled={currentPage <= 1} onClick={() => onPageChange(Math.max(1, currentPage - 1))} className={btn}>
                    <ChevronLeft size={16} />
                </button>
                <span className="tabular mx-1.5 rounded-lg bg-primary-soft px-2.5 py-1 text-xs font-bold whitespace-nowrap text-primary">
                    {currentPage} / {last}
                </span>
                <button type="button" aria-label="หน้าถัดไป" title="หน้าถัดไป" disabled={currentPage >= last} onClick={() => onPageChange(Math.min(last, currentPage + 1))} className={btn}>
                    <ChevronRight size={16} />
                </button>
                <button type="button" aria-label="หน้าสุดท้าย" title="หน้าสุดท้าย" disabled={currentPage >= last} onClick={() => onPageChange(last)} className={btn}>
                    <ChevronsRight size={16} />
                </button>
            </div>
        </div>
    );
}

export function PaginationInfo({ totalItems }: { totalItems: number }) {
    return (
        <div className="flex items-center justify-center rounded-2xl border border-line bg-surface p-3 text-xs font-bold text-muted shadow-card">
            ทั้งหมด {totalItems.toLocaleString()} รายการ
        </div>
    );
}
