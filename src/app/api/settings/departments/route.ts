import { z } from 'zod';
import { handle, ok } from '@/lib/http/response';
import { requireRole, Role } from '@/lib/auth/guard';
import { permissionRepo } from '@/lib/repositories/permissionRepo';

const schema = z.discriminatedUnion('action', [
    z.object({ action: z.literal('rename'), from: z.string().min(1).max(60), to: z.string().min(1).max(60) }),
    z.object({ action: z.literal('delete'), name: z.string().min(1).max(60) }),
]);

/** เปลี่ยนชื่อ/ลบฝ่าย — อัปเดตผู้ใช้ที่สังกัดฝ่ายนั้นไปพร้อมกัน */
export const POST = handle(async (req) => {
    await requireRole(Role.SUPERADMIN);
    const body = schema.parse(await req.json());
    const result =
        body.action === 'rename'
            ? await permissionRepo.renameDepartment(body.from, body.to)
            : await permissionRepo.deleteDepartment(body.name);
    return ok(result, body.action === 'rename' ? 'Department renamed' : 'Department deleted');
});
