"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarClock, ChevronRight, Filter, Loader2, RotateCw, User, UserRound } from "lucide-react";
import { LogDetailModal } from "./LogDetailModal";
import { ListToolbar, ToolbarSelect } from "@/app/components/ui/ListToolbar";
import { EmptyState, Section } from "@/app/components/ui/kit";
import { TableSkeletonRows } from "@/app/components/ui/list";
import { systemLogsService, type SystemLog } from "@/services/systemLogsService";
import { userService } from "@/services/userService";
import { handleApiError } from "@/lib/axios";
import { cn } from "@/lib/utils";

const ACTION: Record<string, { label: string; cls: string }> = {
    LOGIN: { label: "เข้าสู่ระบบ", cls: "bg-positive-soft text-positive" },
    LOGOUT: { label: "ออกจากระบบ", cls: "bg-surface-2 text-fg-2" },
    POST: { label: "เพิ่ม", cls: "bg-primary-soft text-primary" },
    PUT: { label: "แก้ไข", cls: "bg-warning-soft text-warning" },
    PATCH: { label: "แก้ไข (บางส่วน)", cls: "bg-warning-soft text-warning" },
    DELETE: { label: "ลบ", cls: "bg-negative-soft text-negative" },
};
const actionOf = (a: string) => ACTION[a] ?? { label: a, cls: "bg-primary-soft text-primary" };

const RESOURCES: Record<string, string> = {
    news: "ข่าวสาร",
    activities: "กิจกรรม",
    blog: "บทความ",
    "prayer-rooms": "ห้องละหมาด",
    accounts: "ผู้ใช้",
    settings: "ตั้งค่า/สิทธิ์",
    auth: "การยืนยันตัวตน",
    cron: "งานอัตโนมัติ",
};
const resourceKey = (r: string) => r.replace(/^\/?(api\/)?/, "").split(/[/?]/)[0] || "อื่น ๆ";

const RANGES = [
    { value: "1", label: "24 ชั่วโมง" },
    { value: "7", label: "7 วัน" },
    { value: "30", label: "30 วัน" },
    { value: "90", label: "90 วัน" },
];

const who = (l: SystemLog) => (l._user ? `${l._user.firstName} ${l._user.lastName}`.trim() || l._user.email : l.details?.email || "ไม่ระบุตัวตน");
const time = (v: string) => ({
    d: new Date(v).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }),
    t: new Date(v).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
});

/** ตารางบันทึกระบบ — กรองฝั่ง server และโหลดเพิ่มทีละ 50 รายการ */
export const LogsTable = () => {
    const [search, setSearch] = useState("");
    const [action, setAction] = useState("");
    const [resource, setResource] = useState("");
    const [userId, setUserId] = useState("");
    const [range, setRange] = useState("7");
    const [order, setOrder] = useState<"desc" | "asc">("desc");

    const [rows, setRows] = useState<SystemLog[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [meta, setMeta] = useState({ scanned: 0, totalInRange: 0 });
    const [loading, setLoading] = useState(true);
    const [more, setMore] = useState(false);
    const [error, setError] = useState("");
    const [users, setUsers] = useState<{ value: string; label: string }[]>([]);
    const [selected, setSelected] = useState<SystemLog | null>(null);
    const reqId = useRef(0);

    useEffect(() => {
        userService
            .getAllUsers()
            .then((list) => setUsers(list.map((u) => ({ value: u._id, label: `${u.firstName} ${u.lastName}`.trim() || u.email })).sort((a, b) => a.label.localeCompare(b.label, "th"))))
            .catch(() => setUsers([]));
    }, []);

    const query = useCallback(
        (c?: string | null) => ({
            q: search,
            action,
            resource,
            userId,
            order,
            since: range ? new Date(Date.now() - Number(range) * 86400000).toISOString() : undefined,
            cursor: c,
            limit: 50,
        }),
        [search, action, resource, userId, order, range],
    );

    // ตัวกรองเปลี่ยน → โหลดหน้าแรกใหม่ (ทิ้งผลของคำขอเก่าที่ตอบช้ากว่า)
    const reload = useCallback(async () => {
        const id = ++reqId.current;
        setLoading(true);
        setError("");
        try {
            const r = await systemLogsService.search(query());
            if (id !== reqId.current) return;
            setRows(r.rows);
            setCursor(r.nextCursor);
            setMeta({ scanned: r.scanned, totalInRange: r.totalInRange });
        } catch (e) {
            if (id === reqId.current) setError(handleApiError(e));
        } finally {
            if (id === reqId.current) setLoading(false);
        }
    }, [query]);

    useEffect(() => {
        void reload();
    }, [reload]);

    const loadMore = async () => {
        if (!cursor) return;
        setMore(true);
        try {
            const r = await systemLogsService.search(query(cursor));
            setRows((prev) => [...prev, ...r.rows]);
            setCursor(r.nextCursor);
            setMeta((m) => ({ ...m, scanned: m.scanned + r.scanned }));
        } catch (e) {
            setError(handleApiError(e));
        } finally {
            setMore(false);
        }
    };

    const clear = () => {
        setSearch("");
        setAction("");
        setResource("");
        setUserId("");
        setRange("7");
    };

    return (
        <div className="space-y-4">
            <ListToolbar
                search={search}
                onSearch={setSearch}
                placeholder="ค้นหาชื่อ, อีเมล, การกระทำ, IP…"
                activeFilters={[action, resource, userId, range !== "7" ? range : ""].filter(Boolean).length}
                onClear={clear}
                filters={
                    <>
                        <ToolbarSelect label="ช่วงเวลา" value={range} onChange={setRange} allLabel="ทั้งหมด" options={RANGES} icon={<CalendarClock className="size-4" />} />
                        <ToolbarSelect label="การกระทำ" value={action} onChange={setAction} allLabel="ทุกการกระทำ" options={Object.entries(ACTION).map(([value, a]) => ({ value, label: a.label }))} icon={<Filter className="size-4" />} />
                        <ToolbarSelect label="ส่วนของระบบ" value={resource} onChange={setResource} allLabel="ทุกส่วน" options={Object.entries(RESOURCES).map(([value, label]) => ({ value, label }))} />
                        <ToolbarSelect label="ผู้ใช้" value={userId} onChange={setUserId} allLabel="ทุกคน" options={users} icon={<UserRound className="size-4" />} />
                    </>
                }
                sort={{ value: order, onChange: (v) => setOrder(v as "asc" | "desc"), options: [{ value: "desc", label: "ล่าสุดก่อน" }, { value: "asc", label: "เก่าสุดก่อน" }] }}
                summary={
                    !loading &&
                    !error && (
                        <span className="flex flex-wrap items-center gap-x-2">
                            แสดง {rows.length.toLocaleString()} รายการ · ในช่วงเวลานี้มีทั้งหมด {meta.totalInRange.toLocaleString()} รายการ
                            <button type="button" onClick={reload} className="inline-flex items-center gap-1 font-bold text-primary hover:underline">
                                <RotateCw className="size-3" /> รีเฟรช
                            </button>
                        </span>
                    )
                }
            />

            {error ? (
                <Section>
                    <EmptyState art="logs" title="โหลดบันทึกระบบไม่สำเร็จ" description={error} action={<button type="button" className="btn-primary" onClick={reload}>ลองใหม่</button>} />
                </Section>
            ) : loading ? (
                <TableSkeletonRows rows={10} />
            ) : rows.length === 0 ? (
                <Section>
                    <EmptyState
                        art="logs"
                        title="ไม่พบบันทึกที่ตรงกับตัวกรอง"
                        description={cursor ? "ช่วงที่ตรวจไปแล้วยังไม่พบ ลองค้นต่อในข้อมูลที่เก่ากว่า" : "ลองขยายช่วงเวลาหรือล้างตัวกรอง"}
                        action={
                            cursor ? (
                                <button type="button" className="btn-primary" onClick={loadMore} disabled={more}>
                                    {more && <Loader2 className="size-4 animate-spin" />} ค้นต่อ
                                </button>
                            ) : (
                                <button type="button" className="btn-secondary" onClick={clear}>ล้างตัวกรอง</button>
                            )
                        }
                    />
                </Section>
            ) : (
                <>
                    <Section className="hidden md:block" bodyClassName="overflow-x-auto custom-scrollbar">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead>
                                <tr className="border-b border-line bg-surface-2/60 text-left text-xs font-bold text-muted">
                                    <th className="px-5 py-3">เวลา</th>
                                    <th className="px-4 py-3">ผู้ใช้</th>
                                    <th className="px-4 py-3">การกระทำ</th>
                                    <th className="px-4 py-3">ส่วนของระบบ</th>
                                    <th className="px-4 py-3">IP</th>
                                    <th className="w-10 px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {rows.map((l) => {
                                    const a = actionOf(l.action);
                                    const t = time(l.createdAt);
                                    return (
                                        <tr key={l._id} onClick={() => setSelected(l)} className="cursor-pointer transition-colors hover:bg-surface-2/60">
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <p className="text-xs font-bold text-fg-2">{t.d}</p>
                                                <p className="tabular text-[11px] text-muted">{t.t}</p>
                                            </td>
                                            <td className="max-w-[240px] px-4 py-3">
                                                <p className="truncate font-bold text-fg">{who(l)}</p>
                                                {l._user?.email && <p className="truncate text-xs text-muted">{l._user.email}</p>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold", a.cls)}>{a.label}</span>
                                            </td>
                                            <td className="max-w-[260px] px-4 py-3">
                                                <p className="text-xs font-bold text-fg-2">{RESOURCES[resourceKey(l.resource)] ?? resourceKey(l.resource)}</p>
                                                <p className="truncate font-mono text-[11px] text-muted">{l.resource}</p>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-muted">{l.ip || "—"}</td>
                                            <td className="px-4 py-3 text-muted">
                                                <ChevronRight className="size-4" />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </Section>

                    <ul className="space-y-2 md:hidden">
                        {rows.map((l) => {
                            const a = actionOf(l.action);
                            const t = time(l.createdAt);
                            return (
                                <li key={l._id}>
                                    <button type="button" onClick={() => setSelected(l)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left shadow-card">
                                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
                                            <User className="size-4" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center gap-2">
                                                <span className="truncate text-sm font-bold text-fg">{who(l)}</span>
                                                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", a.cls)}>{a.label}</span>
                                            </span>
                                            <span className="block truncate text-xs text-muted">
                                                {RESOURCES[resourceKey(l.resource)] ?? resourceKey(l.resource)} · {t.d} {t.t}
                                            </span>
                                        </span>
                                        <ChevronRight className="size-4 shrink-0 text-muted" />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>

                    {cursor && (
                        <div className="flex justify-center">
                            <button type="button" className="btn-secondary" onClick={loadMore} disabled={more}>
                                {more && <Loader2 className="size-4 animate-spin" />} โหลดเพิ่ม
                            </button>
                        </div>
                    )}
                </>
            )}

            <LogDetailModal isOpen={!!selected} onClose={() => setSelected(null)} log={selected} />
        </div>
    );
};
