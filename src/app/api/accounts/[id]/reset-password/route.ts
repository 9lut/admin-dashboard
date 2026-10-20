import { BadRequest, handle, ok, TooManyRequests } from '@/lib/http/response';
import { generateTempPassword } from '@/lib/inputs/accountInput';
import { requireRole, Role } from '@/lib/auth/guard';
import { accountRepo } from '@/lib/repositories/accountRepo';
import { getAdminAuth } from '@/lib/firebase/admin';
import { enforceRateLimit, rateLimitKey } from '@/lib/security/rateLimit';

export const POST = handle(async (req, { params }) => {
    // เดิมเปิดให้ admin ด้วย → admin รีเซ็ตรหัสของ superadmin แล้วเข้าบัญชีนั้นได้ (ยกระดับสิทธิ์)
    const admin = await requireRole(Role.SUPERADMIN);
    try {
        enforceRateLimit(rateLimitKey(req, 'admin-password-reset'), 10, 60 * 60 * 1000);
    } catch (error) {
        if (error instanceof Error && error.message === 'RATE_LIMITED') throw TooManyRequests('รีเซ็ตรหัสผ่านบ่อยเกินไป กรุณาลองใหม่ภายหลัง');
        throw error;
    }
    
    const uid = (await params).id;
    if (uid === admin.uid) throw BadRequest('เปลี่ยนรหัสผ่านของตัวเองที่หน้า "บัญชีของฉัน"');
    // Verify user exists
    await accountRepo.findOne(uid);

    const tempPassword = generateTempPassword();

    // Force update password in Firebase Auth directly
    await getAdminAuth().updateUser(uid, { password: tempPassword });
    
    // Set flag to force password change on next login
    await accountRepo.update(uid, { mustChangePassword: true });
    
    // Revoke all existing sessions to force them to log in again with new password
    await getAdminAuth().revokeRefreshTokens(uid);

    return ok({ tempPassword }, 'Temporary password generated successfully');
});
