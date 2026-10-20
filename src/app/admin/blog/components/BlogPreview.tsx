"use client";

import { BlogContentBlock } from "@/types/blog";
import { X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import Image from "next/image";

interface BlogPreviewProps {
    blocks: BlogContentBlock[];
    title: string;
    coverImage: string;
    onClose: () => void;
}

export default function BlogPreview({ blocks, onClose }: BlogPreviewProps) {
    return (
        <div className="fixed inset-0 z-[998] bg-surface overflow-y-auto">
            {/* Header / Close Button */}
            <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-line">
                <h2 className="font-bold text-fg">ตัวอย่างบทความ (Preview)</h2>
                <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                    <X size={24} />
                </Button>
            </div>

            {/* Content Container */}
            <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-8">


                {/* Blocks Content */}
                <style>{`
                    .blog-content p:empty,
                    .blog-content p:has(> br:only-child) {
                        min-height: 1em;
                    }
                    .blog-content p {
                        margin-bottom: 0.25em;
                    }
                `}</style>
                <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
                    {blocks.map((block, index) => {
                        if (block.type === 'paragraph') {
                            return (
                                <div
                                    key={index}
                                    dangerouslySetInnerHTML={{ __html: block.data as string }}
                                    className="blog-content leading-relaxed text-fg-2"
                                />
                            );
                        } else if (block.type === 'image') {
                            const data = block.data as { url: string; caption: string };
                            return (
                                <figure key={index} className="flex flex-col items-center my-8">
                                    {data.url && (
                                        <Image
                                            src={data.url}
                                            alt={data.caption || "Blog Image"}
                                            width={1200}
                                            height={800}
                                            className="w-full h-auto rounded-xl shadow-md"
                                        />
                                    )}
                                    {data.caption && (
                                        <figcaption className="mt-3 text-sm text-center text-slate-500 italic">
                                            {data.caption}
                                        </figcaption>
                                    )}
                                </figure>
                            );
                        }
                        return null;
                    })}
                </div>

            </div>
        </div>
    );
}
