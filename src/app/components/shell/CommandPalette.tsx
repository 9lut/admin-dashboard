"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { Illustration } from "@/app/components/brand/Illustration";
import { cn } from "@/lib/utils";

export type PaletteItem = { href: string; label: string; group: string; art?: string };

const OPEN_EVENT = "mss:palette";
export const openPalette = () => window.dispatchEvent(new Event(OPEN_EVENT));

/** ค้นหาเมนู/สร้างเนื้อหาด่วน (Ctrl+K หรือ ⌘K) */
export function CommandPalette({ items }: { items: PaletteItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- เคลียร์คำค้นทุกครั้งที่เปิด
    setQ("");
    setIdx(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((i) => `${i.label} ${i.group} ${i.href}`.toLowerCase().includes(s)) : items;
  }, [q, items]);

  if (!open) return null;

  const go = (i: PaletteItem | undefined) => {
    if (!i) return;
    setOpen(false);
    router.push(i.href);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="ค้นหาด่วน">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="animate-in relative w-full max-w-lg overflow-hidden rounded-3xl border border-line bg-surface shadow-pop">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-5 text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIdx(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIdx((i) => Math.min(i + 1, results.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setIdx((i) => Math.max(i - 1, 0));
              }
              if (e.key === "Enter") go(results[idx]);
            }}
            placeholder="ค้นหาเมนู หรือสร้างเนื้อหาใหม่…"
            className="h-14 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-muted"
          />
          <kbd className="rounded-md border border-line px-1.5 text-[11px] text-muted">Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2 custom-scrollbar">
          {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">ไม่พบเมนูที่ค้นหา</li>}
          {results.map((r, i) => (
            <li key={r.href}>
              <button
                type="button"
                onMouseEnter={() => setIdx(i)}
                onClick={() => go(r)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors",
                  i === idx ? "bg-primary-soft text-primary" : "text-fg-2",
                )}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2">
                  {r.art && <Illustration name={r.art} className="size-8" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{r.label}</span>
                  <span className="block truncate text-xs text-muted">{r.group}</span>
                </span>
                {i === idx && <CornerDownLeft className="size-4" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
