import { Skeleton } from "@/app/components/ui/skeleton";

/** โครงหน้าระหว่างโหลด (ใช้กับทุกหน้าในหลังบ้าน จึงต้องเป็นแบบกลาง ๆ) */
export default function AdminLoading() {
    return (
        <div className="space-y-6" aria-busy="true" aria-label="กำลังโหลด">
            <div className="space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {Array.from({ length: 4 }, (_, i) => (
                    <Skeleton key={i} className="h-28 rounded-2xl" />
                ))}
            </div>
            <Skeleton className="h-80 rounded-3xl" />
        </div>
    );
}
