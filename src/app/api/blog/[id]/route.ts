import { z } from 'zod';
import { cookies } from 'next/headers';
import { handle, ok } from '@/lib/http/response';
import { requireMenuPermission } from '@/lib/auth/guard';
import { blogRepo } from '@/lib/repositories/blogRepo';
import { moveToTrash, withRevision } from '@/lib/content/lifecycle';
import { recordView } from '@/lib/content/views';
import { NotFound } from '@/lib/http/response';

const updateSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    content: z.array(z.object({ type: z.string(), data: z.any() })).optional(),
    tags: z.array(z.string()).optional(),
    author: z.string().optional(),
    group: z.string().optional(),
    series: z.object({ name: z.string(), order: z.number() }).nullable().optional(),
    referenceUrl: z.string().optional(),
    deletedImages: z.array(z.string()).optional(),
    slug: z.string().optional(),
    status: z.enum(['draft', 'published']).optional(),
    coverImage: z.string().optional(),
});

export const GET = handle(async (_req, { params }) => {
    const { id } = await params;
    const store = await cookies();
    const cookieName = `viewed_blog_${id}`;
    const hasViewed = store.has(cookieName);

    const blog = await blogRepo.findOnePublic(id, !hasViewed);
    if (!hasViewed) {
        store.set(cookieName, 'true', { maxAge: 60 * 60, httpOnly: true, path: '/' });
        await recordView('blog', blog._id);
    }
    return ok(blog, 'Fetched blog by ID');
});

export const PUT = handle(async (req, { params }) => {
    const me = await requireMenuPermission('/admin/blog/content');
    const { id } = await params;
    const dto = updateSchema.parse(await req.json());
    const blog = await withRevision('blog', id, me.uid, () => blogRepo.update(id, dto));
    return ok(blog, 'Blog updated successfully');
});

export const DELETE = handle(async (_req, { params }) => {
    const me = await requireMenuPermission('/admin/blog/content');
    const { id } = await params;
    // ลบ = ย้ายไปถังขยะ (กู้คืนได้ 30 วัน)
    const r = await moveToTrash('blog', [id], me.uid);
    if (!r.trashed.length) throw NotFound('Blog not found');
    return ok(null, 'Blog moved to trash');
});
