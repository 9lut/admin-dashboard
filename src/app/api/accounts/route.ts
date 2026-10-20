import { createAccountSchema, generateTempPassword, uniqueDepartments } from '@/lib/inputs/accountInput';
import { handle, ok } from '@/lib/http/response';
import { requireRole, Role } from '@/lib/auth/guard';
import { accountRepo } from '@/lib/repositories/accountRepo';
import { parsePagination } from '@/lib/http/query';
import { BadRequest } from '@/lib/http/response';


export const GET = handle(async (req) => {
    await requireRole(Role.ADMIN, Role.SUPERADMIN);
    
    const url = new URL(req.url);
    const searchValue = url.searchParams.get('search')?.trim() || undefined;
    if (searchValue && searchValue.length > 100) throw BadRequest('Search query is too long');
    const search = searchValue;
    // ?all=1 → ทั้งหมด (สูงสุด 500) ให้หน้าผู้ใช้กรอง/เรียงฝั่ง client ได้ครบ
    if (url.searchParams.get('all') === '1') {
        const data = await accountRepo.findAll();
        return ok({ data, total: data.length, page: 1, limit: data.length, totalPages: 1 }, 'Get accounts successfully');
    }
    const { page, limit } = parsePagination(url.searchParams);

    const result = await accountRepo.findPaginated(search, page, limit);
    return ok(result, 'Get accounts successfully');
});

export const POST = handle(async (req) => {
    const admin = await requireRole(Role.SUPERADMIN);
    const dto = createAccountSchema.parse(await req.json());
    dto.departments = uniqueDepartments(dto.departments);
    // ไม่ได้ตั้งรหัสผ่าน → สร้างรหัสชั่วคราวให้ และส่งกลับครั้งเดียว (ไม่ได้เก็บไว้ที่ใด)
    const tempPassword = dto.password ? undefined : generateTempPassword();
    const account = await accountRepo.create({ ...dto, password: dto.password ?? tempPassword!, createdBy: admin.sub, mustChangePassword: true });
    return ok({ ...account, tempPassword }, 'Account created successfully', 201);
});
