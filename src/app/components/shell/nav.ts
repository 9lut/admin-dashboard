import {
  BookOpenText,
  CalendarDays,
  CalendarRange,
  ChartLine,
  FolderCog,
  HardDrive,
  Images,
  Trash2,
  HeartHandshake,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Newspaper,
  ScrollText,
  ShieldCheck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** ชื่อภาพประกอบใน illustrations.ts (การ์ด/ค้นหาด่วน) */
  art?: string;
};
/** โฟลเดอร์เมนู — พับ/กางได้ มีเส้นโยงไปเมนูย่อย */
export type NavFolder = { key: string; label: string; icon: LucideIcon; children: NavItem[] };
export type NavEntry = NavItem | NavFolder;
export type NavSection = { title?: string; items: NavEntry[] };
export const isFolder = (e: NavEntry): e is NavFolder => "children" in e;

/** เมนูหลังบ้าน: งานที่ใช้ทุกวันอยู่บนสุด · งานนาน ๆ ครั้งพับไว้ในโฟลเดอร์ */
export const NAV: NavSection[] = [
  {
    title: "ภาพรวม",
    items: [
      { href: "/admin", label: "แดชบอร์ด", icon: LayoutDashboard, art: "dashboard" },
      { href: "/admin/stats", label: "สถิติเนื้อหา", icon: ChartLine, art: "analytics" },
    ],
  },
  {
    title: "เนื้อหาเว็บไซต์",
    items: [
      { href: "/admin/news", label: "ข่าวสาร", icon: Newspaper, art: "news" },
      {
        key: "activity",
        label: "กิจกรรม",
        icon: CalendarDays,
        children: [
          { href: "/admin/activity", label: "รายการกิจกรรม", icon: ListChecks, art: "activities" },
          { href: "/admin/activity/calendar", label: "ปฏิทินกิจกรรม", icon: CalendarRange, art: "calendar" },
        ],
      },
      { href: "/admin/blog/content", label: "บทความ", icon: BookOpenText, art: "blog" },
      { href: "/admin/prayer-rooms", label: "ห้องละหมาด", icon: Landmark, art: "prayer-room" },
      { href: "/admin/settings", label: "ติดต่อ & บริจาค", icon: HeartHandshake, art: "contact" },
      {
        key: "tools",
        label: "เครื่องมือเนื้อหา",
        icon: FolderCog,
        children: [
          { href: "/admin/media", label: "คลังรูป", icon: Images, art: "gallery" },
          { href: "/admin/trash", label: "ถังขยะ", icon: Trash2, art: "trash" },
        ],
      },
    ],
  },
  {
    title: "ผู้ใช้ & ระบบ",
    items: [
      { href: "/admin/users", label: "ผู้ใช้งาน", icon: Users, art: "users" },
      { href: "/admin/permissions", label: "สิทธิ์การเข้าถึง", icon: ShieldCheck, art: "permissions" },
      { href: "/admin/log", label: "บันทึกระบบ", icon: ScrollText, art: "logs" },
      { href: "/admin/storage", label: "พื้นที่จัดเก็บ", icon: HardDrive, art: "settings" },
    ],
  },
  { items: [{ href: "/admin/profile", label: "บัญชีของฉัน", icon: UserRound, art: "profile" }] },
];

export type Access = (href: string) => boolean;

/** เมนูที่ผู้ใช้นี้มองเห็น (ตัดโฟลเดอร์/กลุ่มที่ว่างออก) */
export function navFor(can: Access): NavSection[] {
  const ok = (i: NavItem) => can(i.href);
  return NAV.map((sec) => ({
    ...sec,
    items: sec.items
      .map((e) => (isFolder(e) ? { ...e, children: e.children.filter(ok) } : e))
      .filter((e) => (isFolder(e) ? e.children.length > 0 : ok(e))),
  })).filter((sec) => sec.items.length > 0);
}

export const flatItems = (sections: NavSection[]) =>
  sections.flatMap((s) => s.items.flatMap((e) => (isFolder(e) ? e.children : [e])));

/** เมนูที่ตรงกับ path ที่สุด (href ยาวสุดที่เป็น prefix) — กัน /admin/activity ติด active ตอนอยู่ปฏิทิน */
export function activeHref(pathname: string, items: { href: string }[]) {
  let best = "";
  for (const { href } of items) {
    const hit = pathname === href || pathname.startsWith(href + "/");
    if (hit && href.length > best.length) best = href;
  }
  return best;
}

/** เมนู "＋ สร้าง" (ปุ่มกลางบนมือถือ + ค้นหาด่วน) — href ของรายการหลักใช้เช็กสิทธิ์ */
export const CREATE_ITEMS: { href: string; base: string; label: string; art: string; desc: string }[] = [
  { href: "/admin/news/create", base: "/admin/news", label: "ข่าวสาร", art: "news", desc: "ประกาศ ประชาสัมพันธ์ ข่าวชมรม" },
  { href: "/admin/activity/create", base: "/admin/activity", label: "กิจกรรม", art: "activities", desc: "กิจกรรมใหม่ พร้อมวันเวลาและรูป" },
  { href: "/admin/blog/content/create", base: "/admin/blog/content", label: "บทความ", art: "blog", desc: "บทความความรู้และเนื้อหายาว" },
  { href: "/admin/prayer-rooms/create", base: "/admin/prayer-rooms", label: "ห้องละหมาด", art: "prayer-room", desc: "เพิ่มห้องละหมาดพร้อมปักหมุดแผนที่" },
  { href: "/admin/users/create", base: "/admin/users", label: "ผู้ใช้งาน", art: "users", desc: "บัญชีผู้ดูแล บทบาท และฝ่าย" },
];

/** ชื่อหน้า (แท็บเบราว์เซอร์) จาก path */
export function pageTitle(pathname: string, sections: NavSection[] = NAV) {
  const items = flatItems(sections);
  const href = activeHref(pathname, items);
  const base = items.find((i) => i.href === href)?.label ?? "หลังบ้าน";
  if (pathname.includes("/create")) return `เพิ่ม${base}`;
  if (pathname.includes("/edit")) return `แก้ไข${base}`;
  return base;
}
