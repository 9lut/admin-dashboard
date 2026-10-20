import { Skeleton } from "@/app/components/ui/skeleton";

export function FormSkeleton() {
    return (
        <div className="w-full space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4 pb-4 border-b border-line">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                    <div className="flex-1">
                        <Skeleton className="w-48 h-6 rounded-md mb-2" />
                        <Skeleton className="w-32 h-4 rounded-md hidden sm:block" />
                    </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Skeleton className="w-full sm:w-24 h-10 rounded-xl" />
                    <Skeleton className="w-full sm:w-24 h-10 rounded-xl" />
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Column - Main form fields */}
                <div className="flex-1 space-y-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="w-24 h-5 rounded-md" />
                            <Skeleton className="w-full h-12 rounded-xl" />
                        </div>
                    ))}
                    <div className="space-y-2">
                        <Skeleton className="w-24 h-5 rounded-md" />
                        <Skeleton className="w-full h-64 rounded-xl" />
                    </div>
                </div>

                {/* Right Column - Secondary fields / Image upload */}
                <div className="w-full lg:w-1/3 space-y-6">
                    <div className="p-5 bg-surface rounded-2xl border border-line space-y-4 shadow-sm">
                        <Skeleton className="w-32 h-5 rounded-md" />
                        <Skeleton className="w-full aspect-video rounded-xl" />
                    </div>
                    <div className="p-5 bg-surface rounded-2xl border border-line space-y-4 shadow-sm">
                        <Skeleton className="w-32 h-5 rounded-md" />
                        <Skeleton className="w-full h-12 rounded-xl" />
                        <Skeleton className="w-full h-12 rounded-xl" />
                    </div>
                </div>
            </div>
        </div>
    );
}
