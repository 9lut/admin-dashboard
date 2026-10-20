"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { permissionService, type PermissionSettings } from "@/services/permissionService";
import { allowedMenus } from "@/lib/access/menus";

// แคชระดับโมดูล: สิทธิ์ฝ่ายโหลดครั้งเดียวต่อแท็บ · หน้าจัดการสิทธิ์เรียก invalidateMenuAccess() หลังบันทึก
let cache: Promise<PermissionSettings> | null = null;
const listeners = new Set<() => void>();
const load = () =>
    (cache ??= permissionService.getSettings().catch((e) => {
        cache = null;
        throw e;
    }));

export function invalidateMenuAccess() {
    cache = null;
    listeners.forEach((l) => l());
}

/** สิทธิ์เข้าเมนูของผู้ใช้ปัจจุบัน (กติกาเดียวกับ API ใน lib/access/menus.ts) */
export function useMenuAccess() {
    const { user, isSuperAdmin } = useAuth();
    const [perms, setPerms] = useState<PermissionSettings | null>(null);
    const [failed, setFailed] = useState(false);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const l = () => setTick((t) => t + 1);
        listeners.add(l);
        return () => {
            listeners.delete(l);
        };
    }, []);

    useEffect(() => {
        if (!user || isSuperAdmin) return;
        let alive = true;
        load()
            .then((p) => alive && setPerms(p))
            .catch(() => alive && setFailed(true));
        return () => {
            alive = false;
        };
    }, [user, isSuperAdmin, tick]);

    const allowed = useMemo(
        () => allowedMenus(user?.role, user?.departments, perms?.departments ?? {}),
        [user?.role, user?.departments, perms],
    );
    const can = useMemo(() => (href: string) => allowed.has(href), [allowed]);

    return { can, allowed, ready: isSuperAdmin || !!perms || failed, isSuperAdmin, user };
}
