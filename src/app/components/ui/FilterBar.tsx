import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterBarProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    children?: React.ReactNode; // ตัวกรองเพิ่มเติม (select, ปุ่ม ฯลฯ)
}

export function FilterBar({ searchTerm, onSearchChange, placeholder = "ค้นหา...", className, children }: FilterBarProps) {
    return (
        <div className={cn("mb-4", className)}>
            <div className="flex w-full flex-1 flex-wrap items-center gap-2 lg:w-auto">
                <div className="relative min-w-[200px] flex-1 lg:w-80 lg:flex-none">
                    <Search className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" size={16} />
                    <input
                        type="search"
                        aria-label={placeholder}
                        placeholder={placeholder}
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="input h-10 pr-9 pl-10 [&::-webkit-search-cancel-button]:hidden"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            aria-label="ล้างคำค้นหา"
                            onClick={() => onSearchChange("")}
                            className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
                {children}
            </div>
        </div>
    );
}

interface FilterSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    icon?: React.ReactNode;
    defaultLabel?: string;
    className?: string;
}

export function FilterSelect({ value, onChange, options, icon, defaultLabel = "ทั้งหมด", className }: FilterSelectProps) {
    return (
        <label className={cn("flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-surface px-3 transition-shadow focus-within:border-primary focus-within:ring-4 focus-within:ring-[var(--ring)]", className)}>
            {icon}
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label={defaultLabel}
                className="min-w-[80px] cursor-pointer border-none bg-transparent text-sm text-fg outline-none"
            >
                <option value="">{defaultLabel}</option>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </label>
    );
}
