import api from '@/lib/axios';
import { ApiEnvelope, unwrapResponse } from '@/lib/axios/types';

export type BatchDeleteResult = { deleted: string[]; notFound: string[]; imageErrors: number };
export type BatchResource = 'news' | 'activities' | 'prayer-rooms' | 'blog';

const CHUNK = 100;

/** ลบหลายรายการในคำขอเดียว (แบ่งชุดละ 100) — รูปบน R2 ถูกลบไปด้วยฝั่ง server */
export async function batchDelete(resource: BatchResource, ids: string[]): Promise<BatchDeleteResult> {
    const out: BatchDeleteResult = { deleted: [], notFound: [], imageErrors: 0 };
    for (let i = 0; i < ids.length; i += CHUNK) {
        const r = unwrapResponse(
            await api.post<ApiEnvelope<BatchDeleteResult>>(`/${resource}/batch-delete`, { ids: ids.slice(i, i + CHUNK) }),
        );
        out.deleted.push(...r.deleted);
        out.notFound.push(...r.notFound);
        out.imageErrors += r.imageErrors;
    }
    return out;
}
