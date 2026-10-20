import { selfChangeError, uniqueDepartments, updateAccountSchema } from '@/lib/inputs/accountInput';
import { BadRequest, handle, ok } from '@/lib/http/response';
import { requireRole, Role } from '@/lib/auth/guard';
import { accountRepo } from '@/lib/repositories/accountRepo';


export const GET = handle(async (_req, { params }) => {
    await requireRole(Role.ADMIN, Role.SUPERADMIN);
    const { id } = await params;
    const account = await accountRepo.findOne(id);
    return ok(account, 'Get accounts successfully');
});

export const PUT = handle(async (req, { params }) => {
    const admin = await requireRole(Role.SUPERADMIN);
    const { id } = await params;
    const { role, ...dto } = updateAccountSchema.parse(await req.json());
    dto.departments = uniqueDepartments(dto.departments);

    // เดิม role ถูกส่งมาแต่ไม่เคยถูกบันทึก — ต้องผ่าน updateRole เพื่อตั้ง custom claim ด้วย
    if (role) {
        const err = selfChangeError({ actorId: admin.uid, targetId: id, newRole: role });
        if (err) throw BadRequest(err);
        const current = await accountRepo.findOne(id);
        if (current.role !== role) await accountRepo.updateRole(id, role);
    }
    const account = await accountRepo.update(id, dto);
    return ok(account, 'Account updated successfully');
});

export const DELETE = handle(async (req, { params }) => {
    const admin = await requireRole(Role.SUPERADMIN);
    const { id } = await params;
    // ยืนยันด้วยรหัสผ่านของผู้ลบ (ตรวจฝั่ง server — เดิม client ล็อกอินใหม่เพื่อตรวจ ทำให้ session ถูกแทนที่)
    const body = (await req.json().catch(() => ({}))) as { password?: unknown };
    if (typeof body.password !== 'string' || !body.password) throw BadRequest('กรุณายืนยันด้วยรหัสผ่านของคุณ');
    if (!(await accountRepo.verifyPassword(admin.uid, body.password))) throw BadRequest('รหัสผ่านไม่ถูกต้อง');
    const err = selfChangeError({ actorId: admin.uid, targetId: id, deleting: true });
    if (err) throw BadRequest(err);
    const account = await accountRepo.softDelete(id, admin.sub);
    return ok(account, 'Account deleted successfully');
});
