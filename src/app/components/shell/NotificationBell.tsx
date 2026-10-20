"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Check, CheckCheck, Loader2, X } from "lucide-react";
import api from "@/lib/axios";
import { unwrapResponse, type ApiEnvelope } from "@/lib/axios/types";
import { Illustration } from "@/app/components/brand/Illustration";
import { handleApiError } from "@/lib/axios";
import { toastUtils } from "@/lib/toast";
import type { NotificationItem } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const POLL_MS = 5 * 60 * 1000;
const TONE = { primary: "bg-primary", amber: "bg-warning", green: "bg-positive" } as const;

function ago(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const future = diff < 0;
    const m = Math.round(Math.abs(diff) / 60000);
    const v = m < 60 ? `${m} นาที` : m < 1440 ? `${Math.round(m / 60)} ชั่วโมง` : `${Math.round(m / 1440)} วัน`;
    return m < 1 ? "เมื่อสักครู่" : future ? `อีก ${v}` : `${v}ที่แล้ว`;
}

/** กระดิ่งแจ้งเตือนบนแถบบน — ดึงทุก 5 นาที และทุกครั้งที่กลับมาที่แท็บ */
export function NotificationBell({ userId }: { userId: string }) {
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [open, setOpen] = useState(false);
    const [seen, setSeen] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState<string | null>(null);
    const ref = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const key = `mss_seen_notifs:${userId}`;

    useEffect(() => {
        try {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- อ่านสถานะ "อ่านแล้ว" ที่จำไว้หลัง mount
            setSeen(new Set(JSON.parse(localStorage.getItem(key) ?? "[]")));
        } catch {
            /* ไม่มี storage */
        }
    }, [key]);

    const load = useCallback(async () => {
        try {
            const r = unwrapResponse(await api.get<ApiEnvelope<{ items: NotificationItem[] }>>("/notifications"));
            setItems(r.items);
        } catch {
            /* แจ้งเตือนไม่ใช่ส่วนสำคัญ — เงียบไว้ */
        } finally {
            setLoaded(true);
        }
    }, []);

    useEffect(() => {
        void load();
        const t = setInterval(load, POLL_MS);
        const onFocus = () => document.visibilityState === "visible" && load();
        document.addEventListener("visibilitychange", onFocus);
        return () => {
            clearInterval(t);
            document.removeEventListener("visibilitychange", onFocus);
        };
    }, [load]);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- ปิดแผงเมื่อเปลี่ยนหน้า
    useEffect(() => setOpen(false), [pathname]);
    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent | KeyboardEvent) => {
            if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", close);
        document.addEventListener("keydown", close);
        return () => {
            document.removeEventListener("mousedown", close);
            document.removeEventListener("keydown", close);
        };
    }, [open]);

    const unread = useMemo(() => items.filter((i) => !seen.has(i.id)), [items, seen]);

    const persist = (next: Set<string>) => {
        // เก็บเฉพาะ id ที่ยังมีอยู่ ไม่ให้ storage โตไม่รู้จบ
        const keep = new Set([...next].filter((id) => items.some((i) => i.id === id)));
        setSeen(keep);
        try {
            localStorage.setItem(key, JSON.stringify([...keep]));
        } catch {
            /* ignore */
        }
    };
    const markAll = () => persist(new Set([...seen, ...items.map((i) => i.id)]));
    const markOne = (id: string) => persist(new Set([...seen, id]));

    const review = async (item: NotificationItem) => {
        setBusy(item.id);
        try {
            await api.post("/notifications", { action: "review-news", id: item.id.split(":")[1] });
            setItems((list) => list.filter((i) => i.id !== item.id));
            toastUtils.success("ตรวจแล้ว", "นำข่าวนี้ออกจากรายการรอตรวจ");
        } catch (e) {
            toastUtils.error("ทำรายการไม่สำเร็จ", handleApiError(e));
        } finally {
            setBusy(null);
        }
    };

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={unread.length ? `การแจ้งเตือน ${unread.length} รายการใหม่` : "การแจ้งเตือน"}
                className="relative grid size-10 place-items-center rounded-full border border-line bg-surface text-fg-2 shadow-card transition-colors hover:text-primary"
            >
                <Bell className="size-[18px]" />
                {unread.length > 0 && (
                    <span className="tabular absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-negative px-1 text-[10px] font-bold text-white ring-2 ring-bg">
                        {unread.length > 9 ? "9+" : unread.length}
                    </span>
                )}
            </button>

            {open && (
                <div
                    role="dialog"
                    aria-label="การแจ้งเตือน"
                    className="animate-in fixed inset-x-3 top-16 z-40 flex max-h-[75dvh] flex-col overflow-hidden rounded-3xl border border-line bg-surface text-fg shadow-pop sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-96"
                >
                    <div className="flex items-center gap-2 border-b border-line px-4 py-3">
                        <p className="flex-1 font-bold">การแจ้งเตือน</p>
                        {unread.length > 0 && (
                            <button type="button" onClick={markAll} className="btn-ghost btn-sm">
                                <CheckCheck className="size-3.5" /> อ่านทั้งหมด
                            </button>
                        )}
                        <button type="button" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 sm:hidden" aria-label="ปิด">
                            <X className="size-4" />
                        </button>
                    </div>
                    <div className="overflow-y-auto custom-scrollbar">
                        {!loaded ? (
                            <div className="space-y-2 p-3">
                                {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface-2" />)}
                            </div>
                        ) : items.length === 0 ? (
                            <div className="flex flex-col items-center px-6 py-10 text-center">
                                <Illustration name="empty" className="size-16" />
                                <p className="mt-2 text-sm font-bold">ไม่มีเรื่องที่ต้องจัดการ</p>
                                <p className="text-xs text-muted">กิจกรรมใกล้ถึงวันและข่าวที่รอตรวจจะแสดงที่นี่</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-line">
                                {items.map((n) => {
                                    const isNew = !seen.has(n.id);
                                    return (
                                        <li key={n.id} className={cn("relative flex gap-3 px-4 py-3", isNew && "bg-primary-soft/30")}>
                                            {isNew && <span className={cn("absolute top-5 left-1.5 size-1.5 rounded-full", TONE[n.tone])} aria-hidden />}
                                            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2">
                                                <Illustration name={n.art} className="size-8" />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <Link href={n.href} onClick={() => markOne(n.id)} className="line-clamp-2 text-sm font-bold hover:text-primary">
                                                    {n.title}
                                                </Link>
                                                <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.body}</p>
                                                <div className="mt-1.5 flex items-center gap-2">
                                                    <span className="text-[11px] text-muted">{ago(n.at)}</span>
                                                    {n.kind === "news-review" && (
                                                        <button type="button" onClick={() => review(n)} disabled={busy === n.id} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-positive-soft px-2 py-1 text-[11px] font-bold text-positive hover:opacity-80">
                                                            {busy === n.id ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />} ตรวจแล้ว
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
