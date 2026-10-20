"use client";

import { useState, useEffect, useRef } from "react";
import { BlogGroup } from "@/types/blog";
import { ChevronDown, Plus, Check, Search, X } from "lucide-react";
import { blogService } from "@/services/blogService";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface GroupSelectorProps {
    groups: BlogGroup[];
    value: string;
    onChange: (value: string) => void;
    onGroupCreated: (newGroup: BlogGroup) => void;
    disabled?: boolean;
}

export default function GroupSelector({ groups, value, onChange, onGroupCreated, disabled }: GroupSelectorProps) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filter groups based on search
    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Check if exact match exists
    const exactMatch = groups.find(g => g.name.toLowerCase() === searchTerm.toLowerCase());

    // Get selected group name
    const selectedGroup = groups.find(g => (g._id === value || g.id === value));

    // Handle outside click to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleCreateGroup = async () => {
        if (!searchTerm.trim()) return;

        setIsCreating(true);
        try {
            const newGroup = await blogService.createGroup(searchTerm.trim());
            onGroupCreated(newGroup);
            onChange(newGroup._id || newGroup.id || "");
            setSearchTerm("");
            setIsOpen(false);
            toast({ title: "สำเร็จ", description: `สร้างหมวดหมู่ "${newGroup.name}" เรียบร้อยแล้ว`, variant: "default" });
        } catch (error: any) {
            console.error("Create group error:", error);
            toast({ title: "ผิดพลาด", description: "ไม่สามารถสร้างหมวดหมู่ได้", variant: "destructive" });
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Display Button */}
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full px-3 py-2 bg-surface-2 border border-line rounded-xl outline-none focus:ring-2 focus:ring-sky-500 text-sm flex items-center justify-between cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
                <span className={selectedGroup ? "text-fg" : "text-slate-400"}>
                    {selectedGroup ? selectedGroup.name : "เลือกหมวดหมู่..."}
                </span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-surface border border-line rounded-xl shadow-xl max-h-60 overflow-hidden flex flex-col">

                    {/* Search Input */}
                    <div className="p-2 border-b border-line sticky top-0 bg-surface">
                        <div className="relative">
                            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="ค้นหาหรือสร้างใหม่..."
                                className="w-full pl-8 pr-2 py-1.5 text-sm bg-surface-2 rounded-lg outline-none focus:ring-1 focus:ring-sky-500 text-fg placeholder:text-slate-400"
                                autoFocus
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* List */}
                    <div className="overflow-y-auto flex-1 p-1">
                        {filteredGroups.length > 0 ? (
                            filteredGroups.map((group) => {
                                const isSelected = (group._id === value || group.id === value);
                                return (
                                    <div
                                        key={group._id || group.id}
                                        onClick={() => {
                                            onChange(group._id || group.id || "");
                                            setIsOpen(false);
                                            setSearchTerm("");
                                        }}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${isSelected ? "bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400" : "text-fg-2 hover:bg-surface-2"}`}
                                    >
                                        <span>{group.name}</span>
                                        {isSelected && <Check size={14} />}
                                    </div>
                                );
                            })
                        ) : (
                            !searchTerm && <div className="p-4 text-center text-xs text-slate-400">พิมพ์เพื่อค้นหาหรือสร้างใหม่</div>
                        )}

                        {/* Create New Option */}
                        {searchTerm && !exactMatch && (
                            <div
                                onClick={handleCreateGroup}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 mt-1 border-t border-line pt-2"
                            >
                                {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                <span>สร้างหมวดหมู่ใหม่ <strong>"{searchTerm}"</strong></span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
