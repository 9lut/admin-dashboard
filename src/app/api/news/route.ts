import { handle, ok, BadRequest } from '@/lib/http/response';
import { requireMenuPermission } from '@/lib/auth/guard';
import { newsRepo } from '@/lib/repositories/newsRepo';
import { uploadFile } from '@/lib/storage/r2';
import { withCache } from '@/lib/cache';
import { liveOnly } from '@/lib/content/publish';
import { adminMode, readImageUrls, readPublish } from '@/lib/http/content';

export const GET = handle(async (req) => {
    const { searchParams } = new URL(req.url);
    const admin = await adminMode(req, '/admin/news');
    const now = Date.now();
    // หลังบ้านเห็นทุกสถานะ · เว็บสาธารณะเห็นเฉพาะที่เผยแพร่แล้ว (ตั้งเวลาไว้จะขึ้นเองเมื่อถึงเวลา)
    const visible = <T extends object>(rows: T[]) => (admin ? rows : liveOnly(rows, now));

    const monthStr = searchParams.get('month');
    const yearStr = searchParams.get('year');
    if (monthStr && yearStr) {
        const month = parseInt(monthStr, 10);
        const year = parseInt(yearStr, 10);
        if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
            throw BadRequest('Invalid month or year parameter');
        }
        const data = await withCache(`api_news_${month}_${year}`, 120000, () => newsRepo.getNewsByMonthAndYear(month, year));
        return ok(visible(data), `Fetched news for ${month}/${year}`);
    }

    const data = await withCache('api_news_all', 120000, () => newsRepo.findAll());
    return ok(visible(data), 'Fetched all news');
});

export const POST = handle(async (req) => {
    await requireMenuPermission('/admin/news');
    const form = await req.formData();
    const get = (k: string) => form.get(k)?.toString();

    const files = form.getAll('images').filter((f): f is File => f instanceof File);
    const images: string[] = [];
    for (const file of files) images.push(await uploadFile(file));
    images.push(...readImageUrls(get('image_urls')));

    const dateStr = get('date');
    const publish = readPublish(get);
    const created = await newsRepo.create(
        {
            name: get('name'),
            date: dateStr ? new Date(dateStr) : undefined,
            link: get('link'),
            description: get('description'),
            ...publish,
        },
        images,
    );
    return ok(created, 'News created successfully', 201);
});
