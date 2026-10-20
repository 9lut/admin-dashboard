"use client";

import Link from "next/link";
import { Settings, LogOut } from "lucide-react";
import { Illustration } from "@/app/components/brand/Illustration";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { systemApi } from "@/lib/api/system";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ThemeToggle } from "@/app/components/ThemeToggle";

export default function MenuPage() {
  const router = useRouter();
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await authApi.logout();
      router.push("/auth/login?logout=success");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 pt-12 pb-32 md:px-8 md:pt-20">
        <section className="mt-12 mb-20">
          {/* Section Header */}
          <header className="mb-12 md:ml-6 flex flex-col md:flex-row md:items-center md:justify-between px-4 md:px-6">
            <div className="text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 text-xs font-bold mb-4">
                <Settings size={14} />
                <span>Control Panel</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-black text-fg tracking-tight">
                ยินดีต้อนรับสู่ <span className="text-sky-500">MSS Admin</span>
              </h1>
              <div className="mt-2 space-y-2">
                <p className="text-muted text-sm md:text-base max-w-2xl leading-relaxed">
                  ระบบจัดการหลังบ้านแบบครบวงจร{" "}
                  <span className="text-sky-500 font-medium">
                    เลือกเมนูที่คุณต้องการ
                  </span>{" "}
                  เพื่อเริ่มต้นทำงานได้อย่างรวดเร็ว
                </p>
                <div className="flex items-center justify-center md:justify-start gap-2 text-xs md:text-sm w-full">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-2 text-fg-2 rounded-full border border-line">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    {user?.firstName} {user?.lastName}
                  </div>
                  <ThemeToggle />
                </div>
              </div>
            </div>

            <div className="flex justify-center md:justify-end mt-4 lg:mt-0 gap-2">
              <button
                onClick={handleLogout}
                className="
                                    group cursor-pointer relative inline-flex items-center gap-2
                                    px-5 py-2.5
                                    bg-gradient-to-r from-red-500 to-rose-500
                                    text-white text-sm font-semibold
                                    rounded-xl
                                    shadow-md hover:shadow-lg
                                    transition-all duration-300
                                    hover:scale-105 active:scale-95
                                    focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2
                                "
              >
                <LogOut
                  size={16}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
                ออกจากระบบ
              </button>
            </div>
          </header>

          {/* Menu Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 max-w-6xl mx-auto px-4 md:px-6">
            {[
              {
                id: "01",
                art: "dashboard",
                title: "แดชบอร์ดผู้ดูแลระบบ",
                desc: "บริหารจัดการข้อมูลและภาพรวมของระบบทั้งหมด",
                href: "/admin",
                color: "group-hover:text-blue-500",
                iconBg: "group-hover:bg-blue-500",
              },
              {
                id: "02",
                art: "blog",
                title: "จัดการบทความ",
                desc: "เขียนและจัดการบทความ ความรู้ของชมรม",
                href: "/admin/blog/content",
                color: "group-hover:text-sky-500",
                iconBg: "group-hover:bg-sky-500",
              },
              {
                id: "03",
                art: "activities",
                title: "จัดการกิจกรรม",
                desc: "เพิ่ม แก้ไข และดูปฏิทินกิจกรรมของชมรม",
                href: "/admin/activity",
                color: "group-hover:text-blue-500",
                iconBg: "group-hover:bg-blue-500",
              },
              {
                id: "04",
                art: "news",
                title: "จัดการข่าวสาร",
                desc: "จัดการข่าวสารและประชาสัมพันธ์",
                href: "/admin/news",
                color: "group-hover:text-sky-500",
                iconBg: "group-hover:bg-sky-500",
              },
              {
                id: "05",
                art: "prayer-room",
                title: "จัดการห้องละหมาด",
                desc: "ข้อมูลห้องละหมาดในมหาวิทยาลัยพร้อมแผนที่",
                href: "/admin/prayer-rooms",
                color: "group-hover:text-blue-500",
                iconBg: "group-hover:bg-blue-500",
              },
              {
                id: "06",
                art: "prayer-times",
                title: "ตารางเวลาละหมาด",
                desc: "แสดงข้อมูลเวลาละหมาดประจำวันอย่างถูกต้องและเป็นปัจจุบัน",
                href: "https://prayertime.msspsuhatyai.org",
                color: "group-hover:text-sky-500",
                iconBg: "group-hover:bg-sky-500",
              },
              {
                id: "07",
                art: "stock",
                title: "ระบบบริหารสต๊อก",
                desc: "ตรวจสอบข้อมูลและสถานะคงเหลือของสิ่งของในคลัง",
                href: "https://stock.msspsuhatyai.org",
                color: "group-hover:text-blue-500",
                iconBg: "group-hover:bg-blue-500",
              },
            ].map((item, index) => (
              <Link href={item.href} key={index} className="group">
                <div className="relative h-full flex flex-col items-center text-center rounded-2xl border border-line bg-surface p-6 md:p-8 transition-all duration-300 hover:-translate-y-2 hover:border-sky-200 dark:hover:border-sky-900 hover:shadow-2xl hover:shadow-sky-500/10">
                  <div className="absolute top-4 font-black text-5xl text-slate-50 dark:text-slate-800/20 opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110 pointer-events-none">
                    {item.id}
                  </div>

                  <div className="relative mb-4 md:mb-6 inline-flex h-16 w-16 md:h-24 md:w-24 items-center justify-center rounded-3xl bg-primary-soft ring-1 ring-inset ring-line transition-transform duration-300 group-hover:scale-110">
                    <Illustration name={item.art} className="h-12 w-12 md:h-20 md:w-20" />
                  </div>

                  <div className="relative z-10">
                    <h3
                      className={`mb-2 text-base md:text-xl font-bold text-fg transition-colors ${item.color}`}
                    >
                      {item.title}
                    </h3>

                    <p className="text-muted leading-relaxed text-[11px] md:text-sm line-clamp-2 md:line-clamp-none font-medium">
                      {item.desc}
                    </p>
                  </div>

                  <div
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-0 transition-all duration-500 group-hover:w-[80%] rounded-full ${item.iconBg}`}
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
