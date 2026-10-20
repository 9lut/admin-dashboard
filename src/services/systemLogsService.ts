import api from "@/lib/axios";
import { ApiEnvelope, unwrapResponse } from '@/lib/axios/types';

export interface SystemLog {
    _id: string;
    action: string;
    resource: string;
    userId?: string;
    details: { email?: string; [key: string]: unknown };
    ip: string;
    createdAt: string;
    _user?: { email: string; firstName: string; lastName: string } | null;
}

export type LogQuery = {
    action?: string;
    userId?: string;
    resource?: string;
    q?: string;
    since?: string;
    until?: string;
    order?: 'asc' | 'desc';
    cursor?: string | null;
    limit?: number;
};

export type LogPage = { rows: SystemLog[]; nextCursor: string | null; scanned: number; totalInRange: number };

export const systemLogsService = {
    /** ค้นหา/กรองฝั่ง server ทีละหน้า (ใช้ nextCursor โหลดต่อ) */
    search: async (query: LogQuery): Promise<LogPage> => {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
        return unwrapResponse(await api.get<ApiEnvelope<LogPage>>(`/system-logs?${params.toString()}`));
    },
};
