import { handle, ok } from '@/lib/http/response';
import { requireMenuPermission } from '@/lib/auth/guard';
import { blogRepo } from '@/lib/repositories/blogRepo';
import { parsePagination } from '@/lib/http/query';

export const GET = handle(async (req) => {
    await requireMenuPermission('/admin/blog/content');
    const { searchParams } = new URL(req.url);
    const { page, limit } = parsePagination(searchParams, 10);
    
    const options = {
        search: searchParams.get('search') || undefined,
        group: searchParams.get('group') || undefined,
        status: searchParams.get('status') || undefined,
        month: searchParams.get('month') || undefined,
        year: searchParams.get('year') || undefined,
        sortKey: searchParams.get('sortKey') || undefined,
        sortDir: (searchParams.get('sortDir') as 'asc' | 'desc' | null) || undefined,
    };
    
    const result = await blogRepo.findAdminPreview(
        options,
        page,
        limit,
    );
    return ok(result, 'Fetched admin blog preview');
});
