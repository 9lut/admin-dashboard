import { cookies } from 'next/headers';
import { handle, NotFound, ok } from '@/lib/http/response';
import { requireMenuPermission } from '@/lib/auth/guard';
import { newsRepo } from '@/lib/repositories/newsRepo';
import { uploadFile } from '@/lib/storage/r2';
import { isLive } from '@/lib/content/publish';
import { moveToTrash, withRevision } from '@/lib/content/lifecycle';
import { recordView } from '@/lib/content/views';
import { adminMode, readImageUrls, readPublish } from '@/lib/http/content';

export const GET = handle(async (req, { params }) => {
    const { id } = await params;
    // หลังบ้าน (?admin=1): เห็นร่าง และไม่นับยอดวิว
    if (await adminMode(req, '/admin/news')) return ok(await newsRepo.findOne(id), 'Fetched news by ID');

    const store = await cookies();
    const cookieName = `viewed_news_${id}`;
    const hasViewed = store.has(cookieName);
    const data = await newsRepo.findOne(id, !hasViewed);
    if (!isLive(data as never, Date.now())) throw NotFound(`News with id '${id}' not found`);
    if (!hasViewed) {
        store.set(cookieName, 'true', { maxAge: 60 * 60, httpOnly: true, path: '/' });
        await recordView('news', data._id);
    }
    return ok(data, 'Fetched news by ID');
});

/** delete_images: JSON string, ส่งซ้ำหลายช่อง หรือ url เดียว */
function readDeleteImages(form: FormData): string[] {
    const raw = form.getAll('delete_images').map((v) => v.toString());
    if (raw.length === 1) {
        try {
            const parsed = JSON.parse(raw[0]);
            return Array.isArray(parsed) ? parsed : [raw[0]];
        } catch {
            return [raw[0]];
        }
    }
    return raw;
}

export const PATCH = handle(async (req, { params }) => {
    const me = await requireMenuPermission('/admin/news');
    const { id } = await params;
    const form = await req.formData();
    const get = (k: string) => form.get(k)?.toString();

    const files = form.getAll('images').filter((f): f is File => f instanceof File);
    const newImages: string[] = [];
    for (const file of files) newImages.push(await uploadFile(file));
    newImages.push(...readImageUrls(get('image_urls')));

    const dateStr = get('date');
    const publish = readPublish(get);
    const updated = await withRevision('news', id, me.uid, () =>
        newsRepo.update(
            id,
            {
                name: get('name'),
                date: dateStr ? new Date(dateStr) : undefined,
                link: get('link'),
                description: get('description'),
                ...publish,
            },
            newImages,
            readDeleteImages(form),
        ),
    );
    return ok(updated, 'News updated successfully');
});

/** ลบ = ย้ายไปถังขยะ (กู้คืนได้ 30 วัน) */
export const DELETE = handle(async (_req, { params }) => {
    const me = await requireMenuPermission('/admin/news');
    const { id } = await params;
    const r = await moveToTrash('news', [id], me.uid);
    if (!r.trashed.length) throw NotFound(`News with id '${id}' not found`);
    return ok(null, 'News moved to trash');
});
