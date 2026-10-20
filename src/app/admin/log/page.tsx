"use client";

import { PageHeader } from "@/app/components/ui/PageHeader";
import { EmptyState } from "@/app/components/ui/kit";
import { LogsTable } from "@/app/components/LogsTable";
import { useAuth } from "@/hooks/useAuth";

export default function SystemLogsPage() {
    const { isSuperAdmin, loading } = useAuth();

    if (!loading && !isSuperAdmin) {
        return <EmptyState art="security" title="ไม่มีสิทธิ์เข้าถึง" description="เฉพาะผู้ดูแลสูงสุดเท่านั้นที่ดูบันทึกระบบได้" />;
    }

    return (
        <div className="w-full space-y-5">
            <PageHeader title="บันทึกระบบ" description="ติดตามการใช้งาน การเพิ่ม/แก้ไข/ลบข้อมูล และการเข้าสู่ระบบของผู้ใช้" art="logs" />
            {isSuperAdmin && <LogsTable />}
        </div>
    );
}
