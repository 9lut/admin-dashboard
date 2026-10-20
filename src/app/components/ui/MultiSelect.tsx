import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';

interface MultiSelectProps {
    options: string[];
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
}

export function MultiSelect({ options, value, onChange, placeholder = "เลือกรายการ..." }: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const filteredOptions = options.filter(opt => 
        opt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOption = (option: string) => {
        if (value.includes(option)) {
            onChange(value.filter(v => v !== option));
        } else {
            onChange([...value, option]);
        }
    };

    const removeOption = (e: React.MouseEvent, option: string) => {
        e.stopPropagation();
        onChange(value.filter(v => v !== option));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchTerm.trim()) {
            e.preventDefault();
            const newOpt = searchTerm.trim();
            if (!value.includes(newOpt)) {
                onChange([...value, newOpt]);
            }
            setSearchTerm('');
        }
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div 
                className={`min-h-[44px] w-full bg-surface-2 border ${isOpen ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-line'} rounded-xl px-3 py-1.5 flex items-center justify-between cursor-text transition-all`}
                onClick={() => setIsOpen(true)}
            >
                <div className="flex flex-wrap gap-1.5 items-center flex-1">
                    {value.length === 0 && !searchTerm && (
                        <span className="text-slate-400 dark:text-slate-500 py-1 text-sm">{placeholder}</span>
                    )}
                    {value.map(opt => (
                        <span 
                            key={opt} 
                            className="inline-flex items-center gap-1 bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 px-2 py-1 rounded-lg text-sm font-medium animate-in zoom-in duration-200"
                        >
                            {opt}
                            <button 
                                type="button" 
                                onClick={(e) => removeOption(e, opt)}
                                className="hover:bg-sky-200 dark:hover:bg-sky-800 rounded-full p-0.5 transition-colors ml-1"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                    <input 
                        type="text" 
                        className="flex-1 min-w-[60px] bg-transparent outline-none text-sm text-slate-800 dark:text-slate-200 py-1"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setIsOpen(true);
                        }}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsOpen(true)}
                        placeholder={value.length === 0 ? "" : "พิมพ์เพื่อค้นหาหรือเพิ่ม..."}
                    />
                </div>
                <div className="pl-2 shrink-0 text-slate-400">
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-line rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    {filteredOptions.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500 text-center">
                            {searchTerm ? (
                                <span>กด <kbd className="bg-surface-2 px-2 py-0.5 rounded text-xs">Enter</kbd> เพื่อเพิ่ม "{searchTerm}"</span>
                            ) : "พิมพ์เพื่อเพิ่มฝ่ายใหม่..."}
                        </div>
                    ) : (
                        <ul className="p-1.5">
                            {filteredOptions.map(opt => {
                                const isSelected = value.includes(opt);
                                return (
                                    <li 
                                        key={opt}
                                        onClick={() => toggleOption(opt)}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm font-medium transition-colors ${
                                            isSelected 
                                            ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400' 
                                            : 'text-fg-2 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <span>{opt}</span>
                                        {isSelected && <Check size={16} className="text-sky-500" />}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
