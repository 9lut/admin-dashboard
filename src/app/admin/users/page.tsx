"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Check, ChevronRight, Clock, KeyRound, LayoutList, Loader2, ShieldCheck, UserCheck, UserPlus, Users, X } from "lucide-react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { ListToolbar, ToolbarSelect } from "@/app/components/ui/ListToolbar";
import { Pagination } from "@/app/components/ui/Pagination";
import { Badge, EmptyState, Section, Segmented, type Tone } from "@/app/components/ui/kit";
import { Skeleton } from "@/app/components/ui/skeleton";
import { useSelection } from "@/app/components/ui/list";
import DeleteUserModal from "./components/DeleteUserModal";
import { UserDrawer } from "./components/UserDrawer";
import { CreateUserModal } from "./components/CreateUserModal";
import { userService } from "@/services/userService";
import { permissionService } from "@/services/permissionService";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_LABEL, type DepartmentMap, type Role } from "@/lib/access/menus";
import { handleApiError } from "@/lib/axios";
import { toastUtils } from "@/lib/toast";
import type { User } from "@/types/user";
import { cn } from "@/lib/utils";

const ROLE_TONE: Record<string, Tone> = { superadmin: "primary", admin: "green", user: "gray" };
const DAY = 86400000;
const STATUS = [
    { value: "active30", label: "เข้าใช้ใน 30 วัน" },
    { value: "inactive", label: "ไม่ได้เข้าเกิน 30 วัน" },
    { value: "never", label: "ยังไม่เคยเข้าสู่ระบบ" },
    { value: "mustChange", label: "รอเปลี่ยนรหัสผ่าน" },
    { value: "noDept", label: "ยังไม่มีฝ่าย" },
];
const SORTS = [
    { value: "name-asc", label: "ชื่อ ก → ฮ" },
    { value: "created-desc", label: "เพิ่มล่าสุด" },
    { value: "login-desc", label: "เข้าใช้ล่าสุด" },
];

const time = (v?: string | null) => (v ? new Date(v).getTime() || 0 : 0);
function ago(v?: string | null) {
    const t = time(v);
    if (!t) return "ยังไม่เคยเข้าสู่ระบบ";
    const d = Math.floor((Date.now() - t) / DAY);
    return d <= 0 ? "เข้าวันนี้" : d === 1 ? "เข้าเมื่อวาน" : d < 30 ? `${d} วันที่แล้ว` : d < 365 ? `${Math.floor(d / 30)} เดือนที่แล้ว` : `${Math.floor(d / 365)} ปีที่แล้ว`;
}
const fullName = (u: User) => `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email;

function Avatar({ u, size = "md" }: { u: User; size?: "sm" | "md" }) {
    return (
        <span className={cn("grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-400 to-sky-700 font-bold text-white", size === "sm" ? "size-8 text-xs" : "size-10 text-sm")}>
            {`${u.firstName?.charAt(0) ?? ""}${u.lastName?.charAt(0) ?? ""}`.toUpperCase() || "?"}
        </span>
    );
}

function Check4({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            aria-pressed={on}
            aria-label={label}
            className={cn("grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors", on ? "border-primary bg-primary text-primary-fg" : "border-line-strong hover:border-primary")}
        >
            {on && <Check className="size-3" strokeWidth={3} />}
        </button>
    );
}

function UsersInner() {
    const router = useRouter();
    const params = useSearchParams();
    const { user: me, isSuperAdmin, loading: authLoading } = useAuth();

    const [users, setUsers] = useState<User[] | null>(null);
    const [map, setMap] = useState<DepartmentMap>({});
    const [error, setError] = useState("");
    const [view, setView] = useState<"list" | "dept">("list");
    const [search, setSearch] = useState("");
    const [role, setRole] = useState("");
    const [dept, setDept] = useState(params.get("department") ?? "");
    const [status, setStatus] = useState("");
    const [sort, setSort] = useState("name-asc");
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);

    const [openId, setOpenId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [toDelete, setToDelete] = useState<User | null>(null);
    const [bulkBusy, setBulkBusy] = useState(false);
    const sel = useSelection();

    const load = useCallback(async () => {
        setError("");
        try {
            const [list, perms] = await Promise.all([userService.getAllUsers(), permissionService.getSettings()]);
            setUsers(list);
            setMap(perms.departments ?? {});
        } catch (e) {
            setError(handleApiError(e));
        }
    }, []);
    useEffect(() => {
        if (isSuperAdmin) void load();
    }, [isSuperAdmin, load]);
    useEffect(() => setPage(1), [search, role, dept, status, sort, perPage]);

    const deptNames = useMemo(() => Object.keys(map).sort((a, b) => a.localeCompare(b, "th")), [map]);
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const now = Date.now();
        const out = (users ?? []).filter((u) => {
            if (q && !`${u.firstName} ${u.lastName} ${u.email} ${u.phoneNumber ?? ""} ${(u.departments ?? []).join(" ")}`.toLowerCase().includes(q)) return false;
            if (role && u.role !== role) return false;
            if (dept === "__none" ? (u.departments ?? []).length > 0 : dept && !(u.departments ?? []).includes(dept)) return false;
            const last = time(u.lastLoginAt);
            if (status === "active30" && !(last && now - last <= 30 * DAY)) return false;
            if (status === "inactive" && !(last && now - last > 30 * DAY)) return false;
            if (status === "never" && last) return false;
            if (status === "mustChange" && !u.mustChangePassword) return false;
            if (status === "noDept" && (u.role === "superadmin" || (u.departments ?? []).length)) return false;
            return true;
        });
        const [key, dir] = sort.split("-");
        const s = dir === "asc" ? 1 : -1;
        return out.sort((a, b) =>
            key === "name" ? s * fullName(a).localeCompare(fullName(b), "th") : key === "login" ? s * (time(a.lastLoginAt) - time(b.lastLoginAt)) : s * (time(a.createdAt) - time(b.createdAt)),
        );
    }, [users, search, role, dept, status, sort]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const rows = filtered.slice((page - 1) * perPage, page * perPage);
    const pageIds = rows.map((r) => r._id);
    const allOnPage = pageIds.length > 0 && pageIds.every((id) => sel.has(id));
    const opened = users?.find((u) => u._id === openId) ?? null;

    const counts = useMemo(() => {
        const all = users ?? [];
        return {
            all: all.length,
            superadmin: all.filter((u) => u.role === "superadmin").length,
            noDept: all.filter((u) => u.role !== "superadmin" && !(u.departments ?? []).length).length,
            mustChange: all.filter((u) => u.mustChangePassword).length,
        };
    }, [users]);

    const clear = () => {
        setSearch("");
        setRole("");
        setDept("");
        setStatus("");
        router.replace("/admin/users");
    };

    const patchLocal = (u: User) => setUsers((list) => (list ?? []).map((x) => (x._id === u._id ? { ...x, ...u } : x)));

    const bulk = async (action: "add-department" | "remove-department" | "set-role", value: string) => {
        if (!value) return;
        setBulkBusy(true);
        try {
            const r = await userService.bulk({ action, ids: [...sel.ids], value });
            const verb = action === "add-department" ? `เพิ่มเข้า “${value}”` : action === "remove-department" ? `เอาออกจาก “${value}”` : `เปลี่ยนเป็น${ROLE_LABEL[value as Role]}`;
            toastUtils.success("อัปเดตแล้ว", `${verb} ${r.updated.length} คน${r.failed.length ? ` · ไม่สำเร็จ ${r.failed.length}` : ""}`);
            sel.clear();
            await load();
        } catch (e) {
            toastUtils.error("ทำรายการไม่สำเร็จ", handleApiError(e));
        } finally {
            setBulkBusy(false);
        }
    };

    if (!authLoading && !isSuperAdmin) {
        return <EmptyState art="security" title="เฉพาะผู้ดูแลสูงสุด" description="การจัดการบัญชีผู้ใช้เปิดให้เฉพาะผู้ดูแลสูงสุดเท่านั้น" />;
    }

    const quick = [
        { label: "ผู้ใช้ทั้งหมด", value: counts.all, icon: UserCheck, onClick: clear, warn: false },
        { label: "ผู้ดูแลสูงสุด", value: counts.superadmin, icon: ShieldCheck, onClick: () => setRole("superadmin"), warn: false },
        { label: "ยังไม่มีฝ่าย", value: counts.noDept, icon: Building2, onClick: () => setStatus("noDept"), warn: counts.noDept > 0 },
        { label: "รอเปลี่ยนรหัสผ่าน", value: counts.mustChange, icon: KeyRound, onClick: () => setStatus("mustChange"), warn: false },
    ];

    return (
        <div className="w-full space-y-5">
            <PageHeader title="ผู้ใช้งาน" description="แตะที่ผู้ใช้เพื่อแก้บทบาท ฝ่าย หรือรีเซ็ตรหัสผ่านได้ทันที" art="users">
                <Segmented label="มุมมอง" value={view} onChange={setView} options={[{ id: "list", label: "รายชื่อ" }, { id: "dept", label: "ตามฝ่าย" }]} />
                <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
                    <UserPlus className="size-4" /> <span className="hidden sm:inline">เพิ่มผู้ใช้</span>
                </button>
            </PageHeader>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {quick.map((q) =>
                    !users ? (
                        <Skeleton key={q.label} className="h-[76px] rounded-2xl" />
                    ) : (
                        <button key={q.label} type="button" onClick={q.onClick} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left shadow-card transition-colors hover:border-primary/40">
                            <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", q.warn ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary")}>
                                <q.icon className="size-5" />
                            </span>
                            <span className="min-w-0">
                                <span className="tabular block font-display text-xl leading-tight font-bold text-fg">{q.value}</span>
                                <span className="block truncate text-xs text-muted">{q.label}</span>
                            </span>
                        </button>
                    ),
                )}
            </div>

            {error ? (
                <Section>
                    <EmptyState art="users" title="โหลดรายชื่อผู้ใช้ไม่สำเร็จ" description={error} action={<button type="button" className="btn-primary" onClick={load}>ลองใหม่</button>} />
                </Section>
            ) : view === "dept" ? (
                /* ---------- มุมมองตามฝ่าย ---------- */
                !users ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-48 rounded-3xl" />)}</div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {[...deptNames, "__none"].map((d) => {
                            const members = users.filter((u) => (d === "__none" ? u.role !== "superadmin" && !(u.departments ?? []).length : (u.departments ?? []).includes(d)));
                            if (d === "__none" && !members.length) return null;
                            return (
                                <Section
                                    key={d}
                                    title={<span className="flex items-center gap-2">{d === "__none" ? "ยังไม่มีฝ่าย" : d}<Badge tone={d === "__none" ? "amber" : "gray"}>{members.length} คน</Badge></span>}
                                    description={d === "__none" ? "ผู้ใช้กลุ่มนี้ยังไม่เห็นเมนูใด" : `${map[d]?.length ?? 0} เมนู`}
                                    bodyClassName="p-2"
                                >
                                    {members.length === 0 ? (
                                        <p className="p-4 text-center text-sm text-muted">ยังไม่มีสมาชิก — เปิดผู้ใช้แล้วเลือกฝ่ายนี้</p>
                                    ) : (
                                        <ul>
                                            {members.map((u) => (
                                                <li key={u._id}>
                                                    <button type="button" onClick={() => setOpenId(u._id)} className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left hover:bg-surface-2">
                                                        <Avatar u={u} size="sm" />
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-sm font-bold text-fg">{fullName(u)}</span>
                                                            <span className="block truncate text-[11px] text-muted">{ROLE_LABEL[u.role as Role]} · {ago(u.lastLoginAt)}</span>
                                                        </span>
                                                        <ChevronRight className="size-4 shrink-0 text-muted" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </Section>
                            );
                        })}
                    </div>
                )
            ) : (
                /* ---------- มุมมองรายชื่อ ---------- */
                <>
                    <ListToolbar
                        search={search}
                        onSearch={setSearch}
                        placeholder="ค้นหา ชื่อ, อีเมล, เบอร์โทร, ฝ่าย…"
                        activeFilters={[role, dept, status].filter(Boolean).length}
                        onClear={clear}
                        filters={
                            <>
                                <ToolbarSelect label="บทบาท" value={role} onChange={setRole} allLabel="ทุกบทบาท" options={(["superadmin", "admin", "user"] as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
                                <ToolbarSelect label="ฝ่าย" value={dept} onChange={setDept} allLabel="ทุกฝ่าย" options={[...deptNames.map((d) => ({ value: d, label: d })), { value: "__none", label: "— ไม่มีฝ่าย —" }]} />
                                <ToolbarSelect label="สถานะ" value={status} onChange={setStatus} allLabel="ทุกสถานะ" options={STATUS} />
                            </>
                        }
                        sort={{ value: sort, onChange: setSort, options: SORTS }}
                        summary={users && `พบ ${filtered.length.toLocaleString()} จาก ${users.length.toLocaleString()} บัญชี · ติ๊กเลือกหลายคนเพื่อจัดฝ่าย/บทบาทพร้อมกัน`}
                    />

                    {!users ? (
                        <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
                    ) : rows.length === 0 ? (
                        <Section>
                            <EmptyState
                                art="users"
                                title={users.length ? "ไม่พบผู้ใช้ที่ตรงกับตัวกรอง" : "ยังไม่มีผู้ใช้"}
                                action={users.length ? <button type="button" className="btn-secondary" onClick={clear}>ล้างตัวกรอง</button> : <button type="button" className="btn-primary" onClick={() => setCreating(true)}>เพิ่มผู้ใช้คนแรก</button>}
                            />
                        </Section>
                    ) : (
                        <Section bodyClassName="divide-y divide-line">
                            <div className="flex items-center gap-3 bg-surface-2/60 px-4 py-2.5 text-xs font-bold text-muted">
                                <Check4 on={allOnPage} onClick={() => sel.setMany(pageIds, !allOnPage)} label="เลือกทั้งหน้า" />
                                <span className="flex-1">ผู้ใช้</span>
                                <span className="hidden w-56 md:block">ฝ่าย</span>
                                <span className="hidden w-32 lg:block">เข้าใช้ล่าสุด</span>
                                <span className="w-5" />
                            </div>
                            {rows.map((u) => {
                                const self = u._id === me?._id;
                                const on = sel.has(u._id);
                                return (
                                    <div
                                        key={u._id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setOpenId(u._id)}
                                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpenId(u._id))}
                                        className={cn("flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/60 focus-visible:bg-surface-2 focus-visible:outline-none", on && "bg-primary-soft/40")}
                                    >
                                        <Check4 on={on} onClick={() => sel.toggle(u._id)} label={`เลือก ${fullName(u)}`} />
                                        <Avatar u={u} />
                                        <div className="min-w-0 flex-1">
                                            <p className="flex items-center gap-1.5 text-sm font-bold text-fg">
                                                <span className="truncate">{fullName(u)}</span>
                                                {self && <Badge tone="primary">คุณ</Badge>}
                                            </p>
                                            <p className="truncate text-xs text-muted">{u.email}</p>
                                            <div className="mt-1 flex flex-wrap items-center gap-1">
                                                <Badge tone={ROLE_TONE[u.role] ?? "gray"}>{ROLE_LABEL[u.role as Role] ?? u.role}</Badge>
                                                {u.mustChangePassword && <Badge tone="amber">รอเปลี่ยนรหัส</Badge>}
                                                {/* มือถือ: ฝ่ายใต้ชื่อ */}
                                                <span className="flex flex-wrap gap-1 md:hidden">
                                                    {u.role !== "superadmin" && ((u.departments ?? []).length ? u.departments!.map((d) => <Badge key={d}>{d}</Badge>) : <Badge tone="amber">ไม่มีฝ่าย</Badge>)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="hidden w-56 flex-wrap gap-1 md:flex">
                                            {u.role === "superadmin" ? <span className="text-xs text-muted">ทุกเมนู</span> : (u.departments ?? []).length ? u.departments!.map((d) => <Badge key={d}>{d}</Badge>) : <Badge tone="amber">ยังไม่มีฝ่าย</Badge>}
                                        </div>
                                        <span className="hidden w-32 items-center gap-1 text-xs text-muted lg:flex"><Clock className="size-3.5" /> {ago(u.lastLoginAt)}</span>
                                        <ChevronRight className="size-5 shrink-0 text-muted" />
                                    </div>
                                );
                            })}
                        </Section>
                    )}
                    {users && filtered.length > perPage && (
                        <div className="flex justify-end">
                            <Pagination currentPage={page} totalPages={totalPages} itemsPerPage={perPage} totalItems={filtered.length} onPageChange={setPage} onItemsPerPageChange={setPerPage} />
                        </div>
                    )}
                </>
            )}

            {/* แถบจัดการหลายคน */}
            {sel.size > 0 && view === "list" && (
                <div className="fixed inset-x-3 bottom-24 z-30 mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-2.5 shadow-pop lg:bottom-6 lg:left-[300px]">
                    <span className="flex items-center gap-1.5 pl-1 text-sm font-bold text-fg"><Users className="size-4 text-primary" /> เลือก {sel.size} คน</span>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        {bulkBusy && <Loader2 className="size-4 animate-spin text-primary" />}
                        <select className="field h-9 w-auto py-1 text-sm" value="" disabled={bulkBusy} onChange={(e) => bulk("add-department", e.target.value)} aria-label="เพิ่มเข้าฝ่าย">
                            <option value="">+ เพิ่มเข้าฝ่าย…</option>
                            {deptNames.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select className="field h-9 w-auto py-1 text-sm" value="" disabled={bulkBusy} onChange={(e) => bulk("remove-department", e.target.value)} aria-label="เอาออกจากฝ่าย">
                            <option value="">− เอาออกจากฝ่าย…</option>
                            {deptNames.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select className="field h-9 w-auto py-1 text-sm" value="" disabled={bulkBusy} onChange={(e) => bulk("set-role", e.target.value)} aria-label="เปลี่ยนบทบาท">
                            <option value="">เปลี่ยนบทบาท…</option>
                            {(["admin", "user", "superadmin"] as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                        </select>
                        <button type="button" onClick={sel.clear} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2" aria-label="ยกเลิกการเลือก">
                            <X className="size-4" />
                        </button>
                    </div>
                </div>
            )}

            <UserDrawer
                user={opened}
                isSelf={opened?._id === me?._id}
                map={map}
                onMapChange={setMap}
                onChanged={patchLocal}
                onClose={() => setOpenId(null)}
                onDelete={(u) => setToDelete(u)}
            />
            <CreateUserModal open={creating} onClose={() => setCreating(false)} onCreated={load} map={map} onMapChange={setMap} />
            {toDelete && (
                <DeleteUserModal
                    isOpen
                    onClose={() => setToDelete(null)}
                    onSuccess={() => {
                        setToDelete(null);
                        setOpenId(null);
                        void load();
                    }}
                    userIdToDelete={toDelete._id}
                    userNameToDelete={fullName(toDelete)}
                />
            )}
        </div>
    );
}

export default function UsersPage() {
    return (
        <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
            <UsersInner />
        </Suspense>
    );
}
