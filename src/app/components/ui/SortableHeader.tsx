import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortConfig<T> {
    key: keyof T;
    direction: 'asc' | 'desc' | null;
}

interface SortableHeaderProps<T> {
    label: string;
    sortKey: keyof T;
    currentSort: SortConfig<T>;
    onSort: (key: keyof T) => void;
    className?: string; // Additional classes (e.g., width)
}

export function SortableHeader<T>({
    label,
    sortKey,
    currentSort,
    onSort,
    className
}: SortableHeaderProps<T>) {
    const isSorted = currentSort.key === sortKey && currentSort.direction !== null;

    return (
        <th
            onClick={() => onSort(sortKey)}
            className={cn(
                "px-6 py-3 cursor-pointer transition-colors select-none group",
                isSorted ? "bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400" : "hover:bg-surface-2",
                className
            )}
        >
            <div className="flex items-center gap-1">
                {label}
                <ArrowUpDown
                    size={12}
                    className={cn(
                        "transition-opacity",
                        isSorted ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                    )}
                />
            </div>
        </th>
    );
}

// Simple Header (Non-sortable)
export function TableHeader({ label, className }: { label: string, className?: string }) {
    return (
        <th className={cn("px-6 py-3 font-semibold text-muted", className)}>
            {label}
        </th>
    );
}
