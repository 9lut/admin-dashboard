import { Skeleton } from "@/app/components/ui/skeleton";

interface TableSkeletonProps {
    columns: number;
    rows?: number;
    avatarColumn?: boolean; // If true, first column is treated as avatar/image
    actionColumn?: boolean; // If true, last column is treated as actions
}

export function TableSkeleton({ columns, rows = 5, avatarColumn = true, actionColumn = true }: TableSkeletonProps) {
    return (
        <>
            {[...Array(rows)].map((_, i) => (
                <tr key={i} className="bg-surface border-b border-line animate-in fade-in duration-500">
                    {[...Array(columns)].map((_, j) => {
                        // First Column (Avatar/Image)
                        if (j === 0 && avatarColumn) {
                            return (
                                <td key={j} className="px-6 py-4">
                                    <Skeleton className="h-10 w-16 rounded-md" />
                                </td>
                            );
                        }
                        // Last Column (Actions)
                        if (j === columns - 1 && actionColumn) {
                            return (
                                <td key={j} className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <Skeleton className="h-8 w-8 rounded-md" />
                                        <Skeleton className="h-8 w-8 rounded-md" />
                                    </div>
                                </td>
                            );
                        }
                        // Middle Columns (Text)
                        return (
                            <td key={j} className="px-6 py-4">
                                <div className="space-y-1.5">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </td>
                        );
                    })}
                </tr>
            ))}
        </>
    );
}
