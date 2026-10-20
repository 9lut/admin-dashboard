"use client";

import { useState } from "react";
import { BlogContentBlock } from "@/types/blog";
import {
    Image as ImageIcon, Type, X, ArrowUp, ArrowDown,
    Trash2, GripVertical, Loader2
} from "lucide-react";
import Image from "next/image";
import { blogService } from "@/services/blogService";
import { useToast } from "@/hooks/use-toast";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import("./RichTextEditor"), { ssr: false, loading: () => <div className="p-4 text-center text-sm text-slate-500">กำลังโหลด...</div> });

interface BlogBlockEditorProps {
    blocks: BlogContentBlock[];
    onChange: (blocks: BlogContentBlock[]) => void;
    onImageDelete?: (url: string) => void;
}

export default function BlogBlockEditor({ blocks, onChange, onImageDelete }: BlogBlockEditorProps) {
    const { toast } = useToast();
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

    const addBlock = (type: 'paragraph' | 'image') => {
        const newBlock: BlogContentBlock = type === 'paragraph'
            ? { type: 'paragraph', data: '' }
            : { type: 'image', data: { url: '', caption: '' } };
        onChange([...blocks, newBlock]);
    };

    const removeBlock = (index: number) => {
        const block = blocks[index];
        if (block.type === 'image' && (block.data as any)?.url) {
            onImageDelete?.((block.data as any).url);
        }
        const newBlocks = [...blocks];
        newBlocks.splice(index, 1);
        onChange(newBlocks);
    };

    const moveBlock = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === blocks.length - 1) return;

        const newBlocks = [...blocks];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const temp = newBlocks[index];
        newBlocks[index] = newBlocks[targetIndex];
        newBlocks[targetIndex] = temp;
        onChange(newBlocks);
    };

    const updateBlockData = (index: number, data: any) => {
        const newBlocks = [...blocks];
        newBlocks[index] = { ...newBlocks[index], data };
        onChange(newBlocks);
    };

    const handleImageUpload = async (index: number, file: File) => {
        setUploadingIndex(index);
        try {
            const result = await blogService.uploadImage(file);
            const currentData = blocks[index].data as { url: string; caption: string };
            if (currentData.url) {
                onImageDelete?.(currentData.url);
            }
            updateBlockData(index, { ...currentData, url: result.url });
        } catch (error) {
            console.error(error);
            toast({ title: "อัปโหลดล้มเหลว", description: "ไม่สามารถอัปโหลดรูปภาพได้", variant: "destructive" });
        } finally {
            setUploadingIndex(null);
        }
    };

    return (
        <div className="space-y-4">
            {blocks.map((block, index) => (
                <div key={index} className="relative group bg-surface-2 border border-line rounded-xl p-4 transition-all hover:shadow-md">

                    {/* Block Controls */}
                    <div className="absolute right-2 top-2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 p-1 rounded-lg border border-line shadow-sm z-10">
                        <button
                            type="button"
                            onClick={() => moveBlock(index, 'up')}
                            disabled={index === 0}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 disabled:opacity-30"
                            title="เลื่อนขึ้น"
                        >
                            <ArrowUp size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={() => moveBlock(index, 'down')}
                            disabled={index === blocks.length - 1}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 disabled:opacity-30"
                            title="เลื่อนลง"
                        >
                            <ArrowDown size={14} />
                        </button>
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                        <button
                            type="button"
                            onClick={() => removeBlock(index)}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded text-rose-500"
                            title="ลบ Block นี้"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>

                    {/* Block Content */}
                    <div className="flex gap-4">
                        <div className="pt-2 text-slate-300">
                            <GripVertical size={20} />
                        </div>

                        <div className="flex-1 min-w-0">
                            {block.type === 'paragraph' ? (
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                                        <Type size={12} /> ย่อหน้า (Paragraph)
                                    </label>
                                    <div className="rich-text-wrapper">
                                        <RichTextEditor
                                            content={block.data as string}
                                            onChange={(html) => updateBlockData(index, html)}
                                            placeholder="พิมพ์เนื้อหาที่นี่..."
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                                        <ImageIcon size={12} /> รูปภาพ (Image)
                                    </label>

                                    <div className="space-y-3">
                                        {(block.data as { url: string }).url ? (
                                            <div className="relative aspect-video w-full max-w-md bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                                <Image
                                                    src={(block.data as { url: string }).url}
                                                    alt="Block Image"
                                                    fill
                                                    className="object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const url = (block.data as any).url;
                                                        if (url) onImageDelete?.(url);
                                                        updateBlockData(index, { ...(block.data as any), url: '' });
                                                    }}
                                                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-rose-500 transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="w-full max-w-md h-40 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center p-4 hover:bg-surface-2 transition-colors relative">
                                                {uploadingIndex === index ? (
                                                    <Loader2 className="animate-spin text-sky-500" />
                                                ) : (
                                                    <>
                                                        <ImageIcon className="text-slate-300 mb-2" size={32} />
                                                        <span className="text-sm text-slate-500">คลิกเพื่ออัปโหลดรูปภาพ</span>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                                            onChange={(e) => {
                                                                if (e.target.files?.[0]) handleImageUpload(index, e.target.files[0]);
                                                            }}
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        <input
                                            type="text"
                                            value={(block.data as { caption: string }).caption || ''}
                                            onChange={(e) => updateBlockData(index, { ...(block.data as any), caption: e.target.value })}
                                            className="w-full max-w-md px-3 py-2 bg-surface border border-line rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500"
                                            placeholder="คำอธิบายรูปภาพ (Caption) - ไม่บังคับ"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            {/* Add Block Buttons */}
            <div className="flex gap-2 justify-center py-4 border-t border-dashed border-line mt-4">
                <button
                    type="button"
                    onClick={() => addBlock('paragraph')}
                    className="flex items-center gap-2 px-4 py-2 bg-surface border border-line hover:border-sky-500 hover:text-sky-600 rounded-xl shadow-sm transition-all text-sm font-medium"
                >
                    <Type size={16} />
                    เพิ่มข้อความ
                </button>
                <button
                    type="button"
                    onClick={() => addBlock('image')}
                    className="flex items-center gap-2 px-4 py-2 bg-surface border border-line hover:border-sky-500 hover:text-sky-600 rounded-xl shadow-sm transition-all text-sm font-medium"
                >
                    <ImageIcon size={16} />
                    เพิ่มรูปภาพ
                </button>
            </div>
        </div>
    );
}
