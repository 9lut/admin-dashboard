import api from '@/lib/axios';
import { ApiEnvelope, unwrapResponse } from '@/lib/axios/types';

export interface PermissionSettings {
    departments: {
        [departmentName: string]: string[];
    };
    /** จำนวนผู้ใช้ต่อฝ่าย (มีเมื่อขอด้วย withCounts และเป็น superadmin) */
    memberCounts?: Record<string, number>;
}

export const permissionService = {
    async getSettings(withCounts = false): Promise<PermissionSettings> {
        const res = await api.get<ApiEnvelope<PermissionSettings>>(`/settings/permissions${withCounts ? '?counts=1' : ''}`);
        return unwrapResponse(res);
    },

    async updateSettings(settings: PermissionSettings): Promise<PermissionSettings> {
        return unwrapResponse(await api.put<ApiEnvelope<PermissionSettings>>('/settings/permissions', { departments: settings.departments }));
    },

    async renameDepartment(from: string, to: string) {
        return unwrapResponse(await api.post<ApiEnvelope<{ moved: number }>>('/settings/departments', { action: 'rename', from, to }));
    },

    async deleteDepartment(name: string) {
        return unwrapResponse(await api.post<ApiEnvelope<{ removed: number }>>('/settings/departments', { action: 'delete', name }));
    },
};
