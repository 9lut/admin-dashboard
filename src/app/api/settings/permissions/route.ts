import { handle, ok } from '@/lib/http/response';
import { requireAuth, requireRole, Role } from '@/lib/auth/guard';
import { permissionRepo } from '@/lib/repositories/permissionRepo';
import { z } from 'zod';

const updateSchema = z.object({
    departments: z.record(z.string().max(60), z.array(z.string().max(100)).max(50)),
});

export const GET = handle(async (req) => {
    // ทุกคนที่ล็อกอินอ่านได้ (แถบเมนูต้องใช้คำนวณเมนูที่มองเห็น — รวม role "user")
    const me = await requireAuth();
    const settings = await permissionRepo.getSettings();

    // superadmin ขอจำนวนสมาชิกต่อฝ่ายได้ (หน้าจัดการสิทธิ์)
    const withCounts = new URL(req.url).searchParams.get('counts') === '1';
    if (withCounts && me.role === Role.SUPERADMIN) {
        return ok({ ...settings, memberCounts: await permissionRepo.memberCounts() });
    }
    return ok(settings);
});

export const PUT = handle(async (req) => {
    await requireRole(Role.SUPERADMIN);
    const data = updateSchema.parse(await req.json());
    const saved = await permissionRepo.updateSettings(data);
    return ok(saved, 'Permissions updated successfully');
});
