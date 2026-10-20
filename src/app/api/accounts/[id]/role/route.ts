import { roleSchema, selfChangeError } from '@/lib/inputs/accountInput';
import { BadRequest, handle, ok } from '@/lib/http/response';
import { requireRole, Role } from '@/lib/auth/guard';
import { accountRepo } from '@/lib/repositories/accountRepo';

export const PATCH = handle(async (req, { params }) => {
    const admin = await requireRole(Role.SUPERADMIN);
    const { id } = await params;
    const { role } = roleSchema.parse(await req.json());
    const err = selfChangeError({ actorId: admin.uid, targetId: id, newRole: role });
    if (err) throw BadRequest(err);
    const account = await accountRepo.updateRole(id, role);
    return ok(account, 'Account role updated successfully');
});
