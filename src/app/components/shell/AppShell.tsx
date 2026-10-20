"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { cn } from "@/lib/utils";
import { useMenuAccess } from "@/hooks/useMenuAccess";
import { canAccessPath } from "@/lib/access/menus";
import ForceChangePassword from "@/app/components/ForceChangePassword";
import { Logo } from "@/app/components/brand/Logo";
import { Illustration } from "@/app/components/brand/Illustration";
import { CommandPalette, openPalette, type PaletteItem } from "./CommandPalette";
import { ThemeCycle, ThemeSegmented } from "./ThemeSwitch";
import { NotificationBell } from "./NotificationBell";
import {
  activeHref,
  CREATE_ITEMS,
  flatItems,
  isFolder,
  navFor,
  pageTitle,
  type NavItem,
  type NavSection,
} from "./nav";

export const SIDEBAR_COOKIE = "mss_sidebar";
const NAV_OPEN_KEY = "mss_admin_nav_open";
const SITE_URL = "https://msspsuhatyai.org";

const ROLE_LABEL: Record<string, string> = {
  superadmin: "ผู้ดูแลสูงสุด",
  admin: "ผู้ดูแลระบบ",
  user: "ผู้ใช้งาน",
};

type Me = { name: string; email: string; role: string; initials: string };

/* ------------------------------------------------------------------ */
/*  ยืนยันออกจากระบบ                                                  */
/* ------------------------------------------------------------------ */
function LogoutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const logout = async () => {
    setBusy(true);
    try {
      await authApi.logout();
    } finally {
      window.location.href = "/auth/login?logout=success";
    }
  };
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="logout-title">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-in relative w-full max-w-sm rounded-3xl border border-line bg-surface p-6 text-center shadow-pop">
        <Illustration name="security" className="mx-auto size-20" />
        <h2 id="logout-title" className="mt-3 text-lg font-bold text-fg">ออกจากระบบ?</h2>
        <p className="mt-1 text-sm text-muted">คุณต้องเข้าสู่ระบบใหม่อีกครั้งเพื่อใช้งาน</p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">ยกเลิก</button>
          <button type="button" onClick={logout} disabled={busy} className="btn-primary">
            <LogOut className="size-4" /> ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  แถบเมนูน้ำเงิน (ตัวอักษรขาว · เมนูที่เลือกเป็นแคปซูลขาว)            */
/* ------------------------------------------------------------------ */
function NavLink({ item, active, collapsed, child, connected, onNavigate }: { item: NavItem; active: boolean; collapsed?: boolean; child?: boolean; connected?: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  // คอม: เมนูที่เลือกเป็น "แท็บ" สีเดียวกับแผงเนื้อหา ยื่นไปชนขอบขวา มีมุมโค้งเว้าบน-ล่าง (.nav-tab)
  const tab = connected && active;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      prefetch={false}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center rounded-xl text-sm transition-all duration-200",
        // ย่อแถบ: ปุ่มไอคอนกลาง · ถ้าเป็นแท็บที่เลือกให้ยืดไปชนขอบขวาเพื่อต่อกับหน้า
        collapsed ? (tab ? "ml-1 h-11 justify-center" : "mx-auto size-11 justify-center") : child ? "gap-2.5 px-3 py-2" : "gap-3 px-3 py-2.5",
        tab
          ? cn(
              collapsed ? "-mr-2" : "-mr-3",
              "rounded-l-2xl rounded-r-none bg-surface font-bold text-primary",
              // มุมโค้งเว้าบน/ล่าง: วงกลมโปร่งที่มีเงาสีพื้นแผง ทำให้แท็บดูต่อเนื่องกับหน้า
              "before:pointer-events-none before:absolute before:-top-[18px] before:right-0 before:size-[18px] before:rounded-br-[18px] before:shadow-[6px_6px_0_6px_var(--surface)] before:content-['']",
              "after:pointer-events-none after:absolute after:right-0 after:-bottom-[18px] after:size-[18px] after:rounded-tr-[18px] after:shadow-[6px_-6px_0_6px_var(--surface)] after:content-['']",
            )
          : active
            ? "bg-white font-bold text-sky-700 shadow-[0_8px_20px_-6px_rgba(4,20,60,0.45)]"
            : "font-medium text-white/80 hover:bg-white/10 hover:text-white",
      )}
    >
      {(!child || collapsed) && (
        <Icon className={cn("size-[18px] shrink-0", tab ? "text-primary" : active ? "text-sky-600" : "text-white/70 group-hover:text-white")} strokeWidth={active ? 2.4 : 2} />
      )}
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
    </Link>
  );
}

function NavLinks({ sections, current, collapsed, connected, onNavigate }: { sections: NavSection[]; current: string; collapsed?: boolean; connected?: boolean; onNavigate?: () => void }) {
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- อ่านสถานะพับ/กางที่จำไว้หลัง mount
      setSaved(JSON.parse(localStorage.getItem(NAV_OPEN_KEY) ?? "{}"));
    } catch {
      /* ไม่มี storage — ใช้ค่าเริ่มต้น */
    }
  }, []);
  const toggle = (key: string, now: boolean) =>
    setSaved((o) => {
      const next = { ...o, [key]: !now };
      try {
        localStorage.setItem(NAV_OPEN_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  return (
    <nav aria-label="เมนูหลัก">
      {sections.map((sec, si) => (
        <div key={si} className={cn(si > 0 && "mt-4 border-t border-white/10 pt-4")}>
          {sec.title && !collapsed && <p className="mb-1.5 px-3 text-[11px] font-bold tracking-wider text-white/55">{sec.title}</p>}
          <ul className="space-y-1">
            {sec.items.map((e) => {
              if (!isFolder(e)) {
                return (
                  <li key={e.href}>
                    <NavLink item={e} active={current === e.href} collapsed={collapsed} connected={connected} onNavigate={onNavigate} />
                  </li>
                );
              }
              if (collapsed) {
                return e.children.map((c) => (
                  <li key={c.href}>
                    <NavLink item={c} active={current === c.href} collapsed onNavigate={onNavigate} />
                  </li>
                ));
              }
              const hasActive = e.children.some((c) => c.href === current);
              const open = saved[e.key] ?? true;
              const Icon = e.icon;
              return (
                <li key={e.key}>
                  <button
                    type="button"
                    onClick={() => toggle(e.key, open)}
                    aria-expanded={open}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/10",
                      hasActive ? "text-white" : "text-white/80 hover:text-white",
                    )}
                  >
                    <Icon className="size-[18px] shrink-0 text-white/70 group-hover:text-white" />
                    <span className="flex-1 truncate text-left">{e.label}</span>
                    {!open && hasActive && <span className="size-1.5 rounded-full bg-white" aria-hidden />}
                    <ChevronDown className={cn("size-4 text-white/60 transition-transform duration-200", open && "rotate-180")} />
                  </button>
                  <div className={cn("grid transition-[grid-template-rows] duration-200", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                    <ul className={cn("ml-[21px] min-h-0 space-y-0.5 py-1", open ? "overflow-visible" : "overflow-hidden")} inert={!open}>
                      {e.children.map((c, ci) => {
                        const last = ci === e.children.length - 1;
                        return (
                          <li key={c.href} className="relative pl-3">
                            <div className="absolute top-0 left-0 h-1/2 w-3 rounded-bl-[10px] border-b-2 border-l-2 border-white/20" />
                            {!last && <div className="absolute top-1/2 -bottom-[2px] left-0 w-[2px] bg-white/20" />}
                            {ci === 0 && <div className="absolute -top-1 left-0 h-1 w-[2px] bg-white/20" />}
                            <NavLink item={c} active={c.href === current} child connected={connected} onNavigate={onNavigate} />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Avatar({ initials, size = "md", onBlue }: { initials: string; size?: "sm" | "md"; onBlue?: boolean }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-bold",
        onBlue ? "bg-white text-sky-700" : "bg-gradient-to-br from-sky-400 to-sky-700 text-white",
        size === "sm" ? "size-8 text-xs" : "size-10 text-sm",
      )}
      aria-hidden
    >
      {initials || "M"}
    </span>
  );
}

function SidebarContent({ sections, current, me, collapsed, connected, onNavigate, onLogout }: { sections: NavSection[]; current: string; me: Me; collapsed?: boolean; connected?: boolean; onNavigate?: () => void; onLogout: () => void }) {
  return (
    <div className="sidebar-bg relative flex h-full flex-col overflow-hidden text-white">
      {/* ลายโลโก้จาง ๆ มุมล่าง */}
      <Logo tone="white" className="pointer-events-none absolute -bottom-10 -left-8 size-56 opacity-[0.07]" />
      <Link href="/admin" onClick={onNavigate} className={cn("relative flex items-center py-6", collapsed ? "justify-center px-2" : "gap-3 px-5")}>
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white shadow-[0_8px_20px_-6px_rgba(4,20,60,0.5)]">
          <Logo className="size-7" />
        </span>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="font-display text-lg font-bold tracking-tight">MSS (Admin)</p>
            <p className="truncate text-[11px] font-medium text-white/70">ชมรมมุสลิม ม.อ.หาดใหญ่</p>
          </div>
        )}
      </Link>
      <div className={cn("relative flex-1 overflow-x-hidden overflow-y-auto pb-4 [scrollbar-width:none]", collapsed ? "px-2" : "px-3")}>
        <NavLinks sections={sections} current={current} collapsed={collapsed} connected={connected} onNavigate={onNavigate} />
      </div>
      <div className={cn("relative border-t border-white/10", collapsed ? "p-2 py-3" : "p-3")}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <ThemeCycle className="text-white/80 hover:bg-white/10 hover:text-white" />
            <button type="button" onClick={onLogout} className="grid size-10 place-items-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white" aria-label="ออกจากระบบ" title="ออกจากระบบ">
              <LogOut className="size-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/10 backdrop-blur">
            <Avatar initials={me.initials} size="sm" onBlue />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-bold">{me.name}</p>
              <p className="truncate text-xs text-white/70">{ROLE_LABEL[me.role] ?? me.role}</p>
            </div>
            <button type="button" onClick={onLogout} className="grid size-9 place-items-center rounded-lg text-white/80 hover:bg-white/15 hover:text-white" aria-label="ออกจากระบบ" title="ออกจากระบบ">
              <LogOut className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  เมนูโปรไฟล์ (มุมขวาบน)                                             */
/* ------------------------------------------------------------------ */
function ProfileMenu({ me, compact, onLogout }: { me: Me; compact?: boolean; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // eslint-disable-next-line react-hooks/set-state-in-effect -- ปิดเมนูเมื่อเปลี่ยนหน้า
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

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="เมนูบัญชี"
        className={cn("flex min-w-0 items-center rounded-full border border-line bg-surface py-1 shadow-card transition-colors hover:bg-surface-2", compact ? "px-1" : "gap-2.5 pr-3 pl-1")}
      >
        <Avatar initials={me.initials} size="sm" />
        {!compact && (
          <>
            <span className="min-w-0 text-left leading-tight">
              <span className="block max-w-40 truncate text-sm font-bold text-fg">{me.name}</span>
              <span className="block max-w-40 truncate text-[11px] text-muted">{ROLE_LABEL[me.role] ?? me.role}</span>
            </span>
            <ChevronDown className={cn("size-4 shrink-0 text-muted transition-transform", open && "rotate-180")} />
          </>
        )}
      </button>
      {open && (
        <div role="menu" className="animate-in absolute top-full right-0 z-40 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-3xl border border-line bg-surface p-2 text-fg shadow-pop">
          <div className="flex items-center gap-3 border-b border-line px-2.5 pt-1.5 pb-3">
            <Avatar initials={me.initials} />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold">{me.name}</p>
              <p className="truncate text-xs text-muted">{me.email}</p>
              <span className="mt-1 inline-block rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary">{ROLE_LABEL[me.role] ?? me.role}</span>
            </div>
          </div>
          <ul className="py-1.5">
            <li>
              <Link href="/admin/profile" role="menuitem" className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg">
                <UserRound className="size-4 text-muted" /> บัญชีของฉัน / เปลี่ยนรหัสผ่าน
              </Link>
            </li>
            <li>
              <a href={SITE_URL} target="_blank" rel="noopener noreferrer" role="menuitem" className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg">
                <ExternalLink className="size-4 text-muted" /> ดูหน้าเว็บไซต์
              </a>
            </li>
          </ul>
          <div className="border-t border-line px-1 pt-2.5 pb-1">
            <p className="mb-1.5 px-1.5 text-[11px] font-bold text-muted">ธีม</p>
            <ThemeSegmented />
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-2.5 py-2.5 text-sm font-bold text-primary-fg transition-colors hover:bg-primary-hover"
          >
            <LogOut className="size-4" /> ออกจากระบบ
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  มือถือ: แผ่นเมนู · แผ่น "สร้าง" · แถบเมนูล่าง                      */
/* ------------------------------------------------------------------ */
function Sheet({ open, onClose, side, label, children }: { open: boolean; onClose: () => void; side: "left" | "bottom"; label: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", esc);
    };
  }, [open, onClose]);

  return (
    <div className={cn("fixed inset-0 z-[60] lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open} inert={!open}>
      <div className={cn("absolute inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-300", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div
        role="dialog"
        aria-label={label}
        className={cn(
          "absolute shadow-pop transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)]",
          side === "left" ? "inset-y-2 left-2 w-[84%] max-w-xs overflow-hidden rounded-[28px]" : "inset-x-0 bottom-0 rounded-t-[2rem] bg-surface px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]",
          open ? "translate-0" : side === "left" ? "-translate-x-[110%]" : "translate-y-full",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function BottomBar({ current, onMenu, onCreate, canCreate }: { current: string; onMenu: () => void; onCreate: () => void; canCreate: boolean }) {
  const tabs = useMemo(() => {
    const all = flatItems(navFor(() => true));
    const pick = (href: string, label: string) => ({ href, label, icon: all.find((x) => x.href === href)!.icon });
    return [pick("/admin", "หน้าหลัก"), pick("/admin/news", "ข่าว"), pick("/admin/activity", "กิจกรรม")];
  }, []);

  const tab = (t: (typeof tabs)[number]) => {
    const active = current === t.href || (t.href === "/admin/activity" && current.startsWith("/admin/activity"));
    const Icon = t.icon;
    return (
      <Link key={t.href} href={t.href} prefetch={false} aria-current={active ? "page" : undefined} className="flex w-16 flex-col items-center gap-1 py-2 [-webkit-tap-highlight-color:transparent]">
        <span className={cn("grid h-8 w-14 place-items-center rounded-full transition-colors", active ? "bg-primary-soft text-primary" : "text-muted")}>
          <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
        </span>
        <span className={cn("text-[10px]", active ? "font-bold text-primary" : "font-medium text-muted")}>{t.label}</span>
      </Link>
    );
  };

  return (
    <nav aria-label="เมนูด่วน" className="fixed inset-x-3 bottom-3 z-40 lg:hidden">
      <div className="relative flex items-end rounded-[26px] border border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] shadow-pop backdrop-blur-xl">
        <div className="flex flex-1 justify-evenly">{tabs.slice(0, 2).map(tab)}</div>
        <div className="relative flex w-[68px] flex-col items-center justify-end self-stretch pb-2">
          <button
            type="button"
            onClick={canCreate ? onCreate : onMenu}
            aria-label="สร้างเนื้อหาใหม่"
            className="sidebar-bg absolute -top-5 grid size-14 place-items-center rounded-full text-white shadow-[0_10px_24px_rgba(20,104,194,0.45)] ring-4 ring-bg transition-transform active:scale-90"
          >
            <Plus className="size-6" strokeWidth={2.6} />
          </button>
          <span className="text-[10px] font-semibold text-muted">สร้าง</span>
        </div>
        <div className="flex flex-1 justify-evenly">
          {tabs.slice(2).map(tab)}
          <button type="button" onClick={onMenu} aria-label="เมนูทั้งหมด" className="flex w-16 flex-col items-center gap-1 py-2">
            <span className="grid h-8 w-14 place-items-center text-muted">
              <Menu className="size-5" />
            </span>
            <span className="text-[10px] font-medium text-muted">เมนู</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  AppShell                                                           */
/* ------------------------------------------------------------------ */
export function AppShell({ initialCollapsed, children }: { initialCollapsed: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { can, allowed, ready, user } = useMenuAccess();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const sections = useMemo(() => navFor(can), [can]);
  const items = useMemo(() => flatItems(sections), [sections]);
  const current = activeHref(pathname, items);
  const creates = useMemo(() => CREATE_ITEMS.filter((c) => can(c.base)), [can]);

  const me: Me = useMemo(() => {
    const name = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || user?.email || "ผู้ดูแล";
    const initials = `${user?.firstName?.charAt(0) ?? ""}${user?.lastName?.charAt(0) ?? ""}`.toUpperCase();
    return { name, email: user?.email ?? "", role: user?.role ?? "", initials };
  }, [user]);

  useEffect(() => {
    document.title = `${pageTitle(pathname)} | MSS Admin`;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ปิดแผ่นเมนูเมื่อเปลี่ยนหน้า
    setMenuOpen(false);
    setCreateOpen(false);
  }, [pathname]);

  const palette: PaletteItem[] = useMemo(() => {
    const pages = sections.flatMap((s) =>
      s.items.flatMap((e) => (isFolder(e) ? e.children.map((c) => ({ ...c, group: e.label })) : [{ ...e, group: s.title ?? "บัญชี" }])),
    );
    return [
      ...pages.map((p) => ({ href: p.href, label: p.label, group: p.group, art: p.art })),
      ...creates.map((c) => ({ href: c.href, label: `เพิ่ม${c.label}ใหม่`, group: "สร้างใหม่", art: c.art })),
    ];
  }, [sections, creates]);

  // ตัวกันหน้า: เข้าเมนูที่ไม่มีสิทธิ์ (พิมพ์ URL เอง/บุ๊กมาร์ก) → แสดงหน้าไม่มีสิทธิ์
  // หน้าแรก /admin ที่ไม่มีสิทธิ์แดชบอร์ด → พาไปเมนูแรกที่เข้าได้แทน
  const blocked = ready && !!user && !canAccessPath(pathname, allowed);
  const fallback = items.find((i) => i.href !== "/admin")?.href ?? "/admin/profile";
  useEffect(() => {
    if (blocked && pathname === "/admin") router.replace(fallback);
  }, [blocked, pathname, fallback, router]);

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });

  if (user?.mustChangePassword) return <ForceChangePassword user={user} />;

  const openLogout = () => setLogoutOpen(true);

  return (
    <div className={cn("app-bg min-h-dvh text-fg transition-[padding] duration-300 lg:p-3", collapsed ? "lg:pl-[88px]" : "lg:pl-[268px]")}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[90] focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">
        ข้ามไปเนื้อหา
      </a>

      {/* เดสก์ท็อป: แถบเมนูน้ำเงินติดกับแผงเนื้อหาเป็นชิ้นเดียว (มุมโค้งเฉพาะด้านซ้าย) */}
      <aside className={cn("fixed inset-y-3 left-3 z-30 hidden overflow-hidden rounded-l-[28px] shadow-[-12px_20px_50px_-24px_rgba(10,37,82,0.55)] transition-[width] duration-300 lg:block", collapsed ? "w-[76px]" : "w-[256px]")}>
        <SidebarContent sections={sections} current={current} me={me} collapsed={collapsed} connected onLogout={openLogout} />
      </aside>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} side="left" label="เมนูทั้งหมด">
        <button type="button" onClick={() => setMenuOpen(false)} className="absolute top-6 right-3 z-10 grid size-9 place-items-center rounded-full text-white/80 hover:bg-white/10" aria-label="ปิดเมนู">
          <X className="size-5" />
        </button>
        <SidebarContent sections={sections} current={current} me={me} onNavigate={() => setMenuOpen(false)} onLogout={openLogout} />
      </Sheet>

      <Sheet open={createOpen} onClose={() => setCreateOpen(false)} side="bottom" label="สร้างเนื้อหาใหม่">
        <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-line-strong" />
        {/* หัวแผ่น: แถบน้ำเงินแบบเดียวกับเมนูซ้าย */}
        <div className="sidebar-bg relative mb-3 flex items-center gap-3 overflow-hidden rounded-3xl p-4 text-white">
          <Logo tone="white" className="pointer-events-none absolute -right-4 -bottom-6 size-24 opacity-10" />
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <Plus className="size-5" strokeWidth={2.6} />
          </span>
          <div className="relative min-w-0 flex-1">
            <p className="font-display text-base font-bold">สร้างเนื้อหาใหม่</p>
            <p className="text-xs text-white/75">เลือกประเภทที่ต้องการเพิ่ม</p>
          </div>
          <button type="button" onClick={() => setCreateOpen(false)} className="relative grid size-9 place-items-center rounded-full bg-white/15 hover:bg-white/25" aria-label="ปิด">
            <X className="size-4" />
          </button>
        </div>
        <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line">
          {creates.map((c) => (
            <li key={c.href}>
              <Link
                href={c.href}
                prefetch={false}
                onClick={() => setCreateOpen(false)}
                className="flex items-center gap-3 px-3.5 py-3 transition-colors active:bg-primary-soft"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft">
                  <Illustration name={c.art} className="size-10" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-fg">{c.label}</span>
                  <span className="block truncate text-xs text-muted">{c.desc}</span>
                </span>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-primary">
                  <ChevronRight className="size-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Sheet>

      {/* คอม: แผงขาวเดียว (แถบบน + เนื้อหา) ต่อจากแถบเมนู · มือถือ: แถบบนลอย + การ์ดเนื้อหา */}
      <div className="lg:flex lg:min-h-[calc(100dvh-1.5rem)] lg:flex-col lg:rounded-r-[28px] lg:bg-surface lg:shadow-[12px_20px_50px_-24px_rgba(10,37,82,0.25)]">
      {/* แถบบน: ย่อเมนู · ค้นหา · บัญชี */}
      <header className="sticky top-0 z-20 bg-bg/80 backdrop-blur-xl lg:static lg:rounded-tr-[28px] lg:bg-transparent lg:backdrop-blur-none">
        <div className="flex h-16 items-center gap-2 px-3 sm:px-5 lg:h-16 lg:px-6">
          <button
            type="button"
            onClick={toggle}
            className="hidden size-10 place-items-center rounded-xl text-fg-2 transition-colors hover:bg-surface lg:grid"
            aria-label={collapsed ? "ขยายแถบเมนู" : "ย่อแถบเมนู"}
            aria-expanded={!collapsed}
            title={collapsed ? "ขยายแถบเมนู" : "ย่อแถบเมนู"}
          >
            {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
          </button>
          <Link href="/admin" className="flex items-center gap-2 lg:hidden">
            <span className="sidebar-bg grid size-9 place-items-center rounded-xl">
              <Logo tone="white" className="size-6" />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-sm font-bold text-fg">MSS (Admin)</span>
              <span className="block text-[10px] font-bold text-primary">ม.อ.หาดใหญ่</span>
            </span>
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={openPalette}
              className="hidden h-10 w-72 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm text-muted shadow-card transition-colors hover:text-fg md:flex"
            >
              <Search className="size-4" />
              <span className="flex-1 text-left">ค้นหาเมนู…</span>
              <kbd className="rounded-md border border-line bg-surface-2 px-1.5 text-[11px]">Ctrl K</kbd>
            </button>
            <button type="button" onClick={openPalette} className="grid size-10 place-items-center rounded-full border border-line bg-surface text-fg-2 shadow-card md:hidden" aria-label="ค้นหา">
              <Search className="size-[18px]" />
            </button>
            {user && <NotificationBell userId={user._id} />}
            <ThemeCycle className="hidden rounded-full border border-line bg-surface shadow-card sm:grid" />
            <div className="sm:hidden">
              <ProfileMenu me={me} compact onLogout={openLogout} />
            </div>
            <div className="hidden sm:block">
              <ProfileMenu me={me} onLogout={openLogout} />
            </div>
          </div>
        </div>
      </header>

      {/* แผงเนื้อหาสีขาว มุมโค้งใหญ่ */}
      <main
        id="main"
        className="relative mx-2 mb-28 min-h-[calc(100dvh-5.5rem)] rounded-[28px] border border-line bg-surface px-4 py-5 shadow-card sm:mx-3 sm:px-6 sm:py-6 lg:mx-0 lg:mb-0 lg:min-h-0 lg:flex-1 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-8 lg:pt-1 lg:pb-8 lg:shadow-none"
      >
        {!ready && user && user.role !== "superadmin" ? (
          <div className="space-y-4" aria-busy="true" aria-label="กำลังตรวจสอบสิทธิ์">
            <div className="h-7 w-48 animate-pulse rounded-lg bg-surface-2" />
            <div className="h-64 animate-pulse rounded-3xl bg-surface-2" />
          </div>
        ) : blocked ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <Illustration name="security" className="size-28" />
            <h1 className="mt-4 text-xl font-bold text-fg">ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
            <p className="mt-1 max-w-sm text-sm text-muted">ฝ่ายที่คุณสังกัดยังไม่ได้รับสิทธิ์เมนูนี้ ติดต่อผู้ดูแลสูงสุดเพื่อขอสิทธิ์เพิ่ม</p>
            <Link href={fallback} className="btn-primary mt-6">ไปยังเมนูที่เข้าได้</Link>
          </div>
        ) : (
          children
        )}
      </main>
      </div>

      <BottomBar current={current} onMenu={() => setMenuOpen(true)} onCreate={() => setCreateOpen(true)} canCreate={creates.length > 0} />
      <CommandPalette items={palette} />
      <LogoutDialog open={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </div>
  );
}
