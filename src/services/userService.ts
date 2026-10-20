import api from '@/lib/axios';
import { ApiEnvelope, unwrapResponse } from '@/lib/axios/types';
import { User } from '@/types/user';

interface PaginatedUsers {
    data: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const userService = {
    /** ผู้ใช้ทั้งหมด (สำหรับกรอง/เรียงฝั่ง client) */
    getAllUsers: async () => unwrapResponse(await api.get<ApiEnvelope<PaginatedUsers>>('/accounts?all=1')).data ?? [],
    getUsers: async (page = 1, limit = 20, search?: string) => {
        const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
        if (search) params.append('search', search);
        return unwrapResponse(await api.get<ApiEnvelope<PaginatedUsers>>(`/accounts?${params.toString()}`));
    },
    getUser: async (id: string) => unwrapResponse(await api.get<ApiEnvelope<User>>(`/accounts/${id}`)),
    /** ไม่ส่ง password = ระบบสร้างรหัสชั่วคราวให้ (คืนมาใน tempPassword ครั้งเดียว) */
    createUser: async (data: Partial<User> & { password?: string }) => unwrapResponse(await api.post<ApiEnvelope<User & { tempPassword?: string }>>('/accounts', data)),
    bulk: async (body: { action: 'add-department' | 'remove-department' | 'set-role'; ids: string[]; value: string }) =>
        unwrapResponse(await api.post<ApiEnvelope<{ updated: string[]; failed: { id: string; reason: string }[] }>>('/accounts/bulk', body)),
    updateUser: async (id: string, data: Partial<User>) => unwrapResponse(await api.put<ApiEnvelope<User>>(`/accounts/${id}`, data)),
    updateUserRole: async (id: string, role: string) => unwrapResponse(await api.patch<ApiEnvelope<User>>(`/accounts/${id}/role`, { role })),
    resetUserPassword: async (id: string) => unwrapResponse(await api.post<ApiEnvelope<{ tempPassword: string }>>(`/accounts/${id}/reset-password`)),
    updateMyProfile: async (data: Partial<User> & { currentPassword?: string; password?: string }) => unwrapResponse(await api.put<ApiEnvelope<User>>('/accounts/me', data)),
    getMe: async () => unwrapResponse(await api.get<ApiEnvelope<User>>('/accounts/me')),
    updateMe: async (data: Partial<Pick<User, 'firstName' | 'lastName' | 'phoneNumber'>>) => unwrapResponse(await api.put<ApiEnvelope<User>>('/accounts/me', data)),
    /** ต้องยืนยันด้วยรหัสผ่านของผู้ลบ (ตรวจฝั่ง server) */
    deleteUser: async (id: string, password: string) => unwrapResponse(await api.delete<ApiEnvelope<null>>(`/accounts/${id}`, { data: { password } })),
};
