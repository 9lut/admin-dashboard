"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { id: "light", label: "สว่าง", icon: Sun },
  { id: "dark", label: "มืด", icon: Moon },
  { id: "system", label: "ตามระบบ", icon: Monitor },
] as const;

function useMounted() {
  const [m, setM] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- ธีมรู้ได้หลัง mount เท่านั้น
  useEffect(() => setM(true), []);
  return m;
}

/** ปุ่มเลือกธีม 3 แบบ (สว่าง/มืด/ตามระบบ) */
export function ThemeSegmented() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  return (
    <div role="radiogroup" aria-label="ธีม" className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
      {OPTIONS.map(({ id, label, icon: Icon }) => {
        const on = mounted && theme === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setTheme(id)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-colors",
              on ? "bg-surface text-primary shadow-card" : "text-muted hover:text-fg",
            )}
          >
            <Icon className="size-3.5" /> {label}
          </button>
        );
      })}
    </div>
  );
}

/** ปุ่มสลับธีมแบบไอคอนเดียว (แถบเมนูตอนย่อ) */
export function ThemeCycle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด"}
      title="สลับธีม"
      className={cn("grid size-10 place-items-center rounded-xl text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg", className)}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
