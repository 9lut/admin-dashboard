import { z } from 'zod';
import { handle, ok } from '@/lib/http/response';
import { requireMenuPermission } from '@/lib/auth/guard';
import { col } from '@/lib/firebase/firestore';
import { listRevisions, restoreRevision } from '@/lib/content/lifecycle';
import { CONTENT, CONTENT_TYPES, type ContentType } from '@/lib/content/types';
import { accountRepo } from '@/lib/repositories/accountRepo';
import { withCache } from '@/lib/cache';

const userNames = () =>
    withCache('content:user-names', 60_000, async () => {
        const map: Record<string, string> = {};
        for (const a of await accountRepo.findAll()) map[a._id] = `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim() || String(a.email ?? '');
        return map;
    });

const query = z.object({ type: z.enum(CONTENT_TYPES as [ContentType, ...ContentType[]]), id: z.string().min(1).max(200) });

/** ประวัติการแก้ไขของเนื้อหาชิ้นหนึ่ง (ใหม่ → เก่า) */
export const GET = handle(async (req) => {
    const { type, id } = query.parse(Object.fromEntries(new URL(req.url).searchParams));
    await requireMenuPermission(CONTENT[type].menu);
    const [rows, names] = await Promise.all([listRevisions(type, id), userNames()]);
    return ok(rows.map((r) => ({ ...r, byName: names[r.by] ?? 'ไม่ทราบชื่อ' })));
});

const body = z.object({ revisionId: z.string().min(1).max(200) });

/** ย้อนกลับไปเวอร์ชันที่เลือก (เวอร์ชันปัจจุบันถูกเก็บเป็นประวัติก่อน) */
export const POST = handle(async (req) => {
    const { revisionId } = body.parse(await req.json());
    const rev = await col('revisions').doc(revisionId).get();
    const type = rev.get('type') as ContentType | undefined;
    // ตรวจสิทธิ์ตามประเภทของเวอร์ชันนั้นจริง ๆ (ไม่เชื่อค่าจาก client)
    const me = await requireMenuPermission(type && CONTENT[type] ? CONTENT[type].menu : '/__none__');
    const result = await restoreRevision(revisionId, me.uid);
    return ok(result, 'Restored');
});
