"use client";
import Image from 'next/image';
import { Eye } from 'lucide-react';
import { Illustration } from "@/app/components/brand/Illustration";

interface Content {
    _id: string;
    name_th?: string;
    name_eng?: string;
    images?: string[];
    views?: number;
}

interface PopularContentListProps {
    content: Content[];
}

export const PopularContentList = ({ content }: PopularContentListProps) => {
    return (
        <div className="space-y-4">
            {content.map((item, index) => (
                <div
                    key={item._id}
                    className="group flex items-center gap-4 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-transparent hover:border-blue-100 dark:hover:border-blue-900 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 hover:shadow-md hover:shadow-blue-100/20 dark:hover:shadow-blue-900/10"
                >
                    <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                        <span className="absolute top-1 left-1 z-10 bg-black/50 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                            #{index + 1}
                        </span>
                        {item.images && item.images.length > 0 ? (
                            <Image
                                src={item.images[0]}
                                alt=""
                                aria-hidden="true"
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                        ) : (
                            <div className="grid h-full w-full place-items-center bg-primary-soft">
                                <Illustration name="empty" className="size-10" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                        <h4 className="font-bold text-fg truncate text-sm group-hover:text-blue-500 transition-colors" title={item.name_th}>
                            {item.name_th || "ไม่มีชื่อ"}
                        </h4>
                        {item.name_eng && item.name_eng.trim() !== item.name_th?.trim() && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                                {item.name_eng}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-col items-center justify-center min-w-[3rem] px-2 py-1 rounded-md bg-surface group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                        <Eye size={14} className="text-blue-600 dark:text-blue-400 mb-0.5" />
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                            {(item.views ?? 0) > 999 ? `${((item.views ?? 0) / 1000).toFixed(1)}k` : (item.views ?? 0)}
                        </span>
                    </div>
                </div>
            ))}
            {content.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line py-8 text-center">
                    <Illustration name="empty" className="size-16" />
                    <p className="mt-2 text-sm text-muted">ยังไม่มีข้อมูลยอดนิยม</p>
                </div>
            )}
        </div>
    );
};
