import { BadRequest, handle, ok } from '@/lib/http/response';
import { requireRole, Role } from '@/lib/auth/guard';
import { accountRepo } from '@/lib/repositories/accountRepo';
import { permissionRepo } from '@/lib/repositories/permissionRepo';
import { bulkSchema, selfChangeError } from '@/lib/inputs/accountInput';

/**
 * แก้ผู้ใช้หลายคนพร้อมกัน: เพิ่ม/เอาออกจากฝ่าย หรือเปลี่ยนบทบาท
 * ทำทีละคนฝั่ง server (บทบาทต้องตั้ง custom claim ของ Firebase Auth ทีละบัญชี)
 */
export const POST = handle(async (req) => {
    const admin = await requireRole(Role.SUPERADMIN);
    const body = bulkSchema.parse(await req.json());
    const ids = [...new Set(body.ids)];

    if (body.action === 'add-department') {
        const settings = await permissionRepo.getSettings();
        if (!(body.value in settings.departments)) throw BadRequest('ไม่พบฝ่ายนี้ — สร้างฝ่ายก่อน');
    }
    if (body.action === 'set-role') {
        const err = ids.map((id) => selfChangeError({ actorId: admin.uid, targetId: id, newRole: body.value })).find(Boolean);
        if (err) throw BadRequest(err);
    }

    const updated: string[] = [];
    const failed: { id: string; reason: string }[] = [];
    for (const id of ids) {
        try {
            const acc = await accountRepo.findOne(id);
            if (body.action === 'set-role') {
                if (acc.role !== body.value) await accountRepo.updateRole(id, body.value);
            } else {
                const cur = ((acc.departments as string[] | undefined) ?? []).filter(Boolean);
                const next = body.action === 'add-department' ? [...new Set([...cur, body.value])] : cur.filter((d) => d !== body.value);
                if (next.length !== cur.length) await accountRepo.update(id, { departments: next });
            }
            updated.push(id);
        } catch (e) {
            failed.push({ id, reason: e instanceof Error ? e.message : 'ผิดพลาด' });
        }
    }
    return ok({ updated, failed }, `Updated ${updated.length} account(s)`);
});
