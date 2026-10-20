"use client";

import { useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
// Image extension removed
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    List, ListOrdered, Heading1, Heading2, Heading3,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Link as LinkIcon, Undo, Redo,
    Loader2
} from 'lucide-react';

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
}

export default function RichTextEditor({ content = "", onChange, placeholder = "เริ่มเขียนบทความของคุณ..." }: RichTextEditorProps) {
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const linkInputRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            // Image extension removed
            Placeholder.configure({
                placeholder,
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-sky-600 underline cursor-pointer',
                },
            }),
        ],
        content: content || "",
        editorProps: {
            attributes: {
                class: 'prose prose-slate dark:prose-invert max-w-none min-h-[400px] px-4 py-3 focus:outline-none',
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // Image upload functions removed

    const handleAddLink = () => {
        const existingHref = editor?.getAttributes('link').href || '';
        setLinkUrl(existingHref);
        setShowLinkDialog(true);
    };

    const confirmLink = () => {
        if (linkUrl) {
            const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
            editor?.chain().focus().setLink({ href: url }).run();
        }
        setShowLinkDialog(false);
        setLinkUrl('');
    };

    const removeLink = () => {
        editor?.chain().focus().unsetLink().run();
        setShowLinkDialog(false);
        setLinkUrl('');
    };

    const cancelLink = () => {
        setShowLinkDialog(false);
        setLinkUrl('');
    };

    useEffect(() => {
        if (showLinkDialog && linkInputRef.current) {
            linkInputRef.current.focus();
        }
    }, [showLinkDialog]);

    if (!editor) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin text-sky-500" size={32} /></div>;
    }

    return (
        <div className="border border-line rounded-xl overflow-hidden bg-surface">
            {/* Toolbar */}
            <div className="border-b border-line p-2 bg-surface-2 flex flex-wrap gap-1">
                {/* Text Formatting */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${editor.isActive('bold') ? 'bg-sky-500 text-white' : ''}`}
                    title="Bold"
                >
                    <Bold size={16} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${editor.isActive('italic') ? 'bg-sky-500 text-white' : ''}`}
                    title="Italic"
                >
                    <Italic size={16} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${editor.isActive('underline') ? 'bg-sky-500 text-white' : ''}`}
                    title="Underline"
                >
                    <UnderlineIcon size={16} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${editor.isActive('strike') ? 'bg-sky-500 text-white' : ''}`}
                    title="Strikethrough"
                >
                    <Strikethrough size={16} />
                </button>

                <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1" />

                {/* Headings */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-sky-500 text-white' : ''}`}
                    title="Heading 1"
                >
                    <Heading1 size={16} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-sky-500 text-white' : ''}`}
                    title="Heading 2"
                >
                    <Heading2 size={16} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-sky-500 text-white' : ''}`}
                    title="Heading 3"
                >
                    <Heading3 size={16} />
                </button>

                <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1" />

                {/* Lists */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${editor.isActive('bulletList') ? 'bg-sky-500 text-white' : ''}`}
                    title="Bullet List"
                >
                    <List size={16} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${editor.isActive('orderedList') ? 'bg-sky-500 text-white' : ''}`}
                    title="Ordered List"
                >
                    <ListOrdered size={16} />
                </button>

                <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1" />

                {/* Alignment */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-sky-500 text-white' : ''}`}
                    title="Align Left"
                >
                    <AlignLeft size={16} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-sky-500 text-white' : ''}`}
                    title="Align Center"
                >
                    <AlignCenter size={16} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-sky-500 text-white' : ''}`}
                    title="Align Right"
                >
                    <AlignRight size={16} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                    className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${editor.isActive({ textAlign: 'justify' }) ? 'bg-sky-500 text-white' : ''}`}
                    title="Align Justify"
                >
                    <AlignJustify size={16} />
                </button>

                <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1" />

                {/* Links (Image Removed) */}
                <button
                    type="button"
                    onClick={handleAddLink}
                    className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${editor.isActive('link') ? 'bg-sky-500 text-white' : ''}`}
                    title="Add Link"
                >
                    <LinkIcon size={16} />
                </button>

                <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1" />

                <button
                    type="button"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors disabled:opacity-30"
                    title="Undo"
                >
                    <Undo size={16} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors disabled:opacity-30"
                    title="Redo"
                >
                    <Redo size={16} />
                </button>
            </div>

            {/* Link Dialog */}
            {showLinkDialog && (
                <div className="border-b border-line px-4 py-3 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm">
                    <div className="flex items-center gap-2 max-w-lg">
                        <input
                            ref={linkInputRef}
                            type="url"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') confirmLink();
                                if (e.key === 'Escape') cancelLink();
                            }}
                            placeholder="https://example.com"
                            className="flex-1 px-3 py-1.5 text-sm bg-surface border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                        />
                        <button
                            type="button"
                            onClick={confirmLink}
                            className="px-3 py-1.5 text-sm font-medium bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors"
                        >
                            เพิ่มลิงก์
                        </button>
                        {editor?.isActive('link') && (
                            <button
                                type="button"
                                onClick={removeLink}
                                className="px-3 py-1.5 text-sm font-medium bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors"
                            >
                                ลบลิงก์
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={cancelLink}
                            className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            ยกเลิก
                        </button>
                    </div>
                </div>
            )}

            <EditorContent editor={editor} />
        </div>
    );
}
