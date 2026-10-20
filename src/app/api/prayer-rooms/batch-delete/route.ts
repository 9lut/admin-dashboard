import { z } from 'zod';
import { handle, ok } from '@/lib/http/response';
import { requireMenuPermission } from '@/lib/auth/guard';
import { moveToTrash } from '@/lib/content/lifecycle';

const schema = z.object({ ids: z.array(z.string().min(1).max(200)).min(1).max(100) });

/** ลบหลายรายการ = ย้ายไปถังขยะในครั้งเดียว (กู้คืนได้ 30 วัน · รูปถูกลบตอนลบถาวร) */
export const POST = handle(async (req) => {
    const me = await requireMenuPermission('/admin/prayer-rooms');
    const { ids } = schema.parse(await req.json());
    const r = await moveToTrash('prayer-rooms', ids, me.uid);
    return ok({ deleted: r.trashed, notFound: r.notFound, imageErrors: 0 }, `Moved ${r.trashed.length} item(s) to trash`);
});
