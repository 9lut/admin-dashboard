import { Skeleton } from "@/app/components/ui/skeleton";

interface GridSkeletonProps {
    count?: number;
}

export function GridSkeleton({ count = 6 }: GridSkeletonProps) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 animate-in fade-in duration-500">
            {[...Array(count)].map((_, i) => (
                <div key={i} className="bg-surface rounded-xl overflow-hidden border border-line shadow-sm">
                    <Skeleton className="aspect-[4/3] w-full" />
                    <div className="p-3 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-1/2" />
                        <div className="pt-2 mt-2 border-t border-line flex justify-between">
                            <Skeleton className="h-4 w-10" />
                            <div className="flex gap-1">
                                <Skeleton className="h-6 w-6 rounded" />
                                <Skeleton className="h-6 w-6 rounded" />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
