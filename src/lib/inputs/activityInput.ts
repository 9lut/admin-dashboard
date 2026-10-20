import 'server-only';
import { uploadFile } from '../storage/r2';
import type { ActivityFields } from '../repositories/activityRepo';
import { readImageUrls, readPublish } from '../http/content';

export type ParsedActivity = {
    fields: ActivityFields;
    newImages: string[];
    deleteImages: string[];
};

function toArray(v: unknown): string[] | undefined {
    if (v === undefined || v === null || v === '') return undefined;
    if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
    const s = String(v).trim();
    // รูปแบบใหม่: JSON array (ข้อความมีจุลภาคได้) · รูปแบบเดิม: คั่นด้วยจุลภาค
    if (s.startsWith('[')) {
        try {
            const parsed = JSON.parse(s);
            if (Array.isArray(parsed)) return parsed.map((x) => String(x).trim()).filter(Boolean);
        } catch {
            /* ไม่ใช่ JSON → ใช้แบบคั่นจุลภาค */
        }
    }
    return s
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

function parseDeleteImages(v: unknown): string[] {
    if (!v) return [];
    if (Array.isArray(v)) return v.map(String);
    if (typeof v === 'string') {
        try {
            const parsed = JSON.parse(v);
            return Array.isArray(parsed) ? parsed : [v];
        } catch {
            return [v];
        }
    }
    return [];
}

function computeDuration(start?: Date | null, end?: Date | null): number | null | undefined {
    if (start && end) {
        const diff = end.getTime() - start.getTime();
        return diff > 0 ? diff / (1000 * 60 * 60) : 0;
    }
    return undefined;
}

function build(raw: Record<string, unknown>): Omit<ParsedActivity, 'newImages'> {
    const start = raw.start_date ? new Date(String(raw.start_date)) : undefined;
    const end = raw.end_date ? new Date(String(raw.end_date)) : undefined;

    const fields: ActivityFields = {
        name_th: raw.name_th as string | undefined,
        name_eng: raw.name_eng as string | undefined,
        location: raw.location as string | undefined,
        participants: raw.participants !== undefined && raw.participants !== '' ? Number(raw.participants) : undefined,
        description: raw.description as string | undefined,
        objectives: toArray(raw.objectives),
        goals: toArray(raw.goals),
        feedbacks: toArray(raw.feedbacks),
        start_date: start,
        end_date: end,
        favorite: raw.favorite !== undefined ? String(raw.favorite) === 'true' : undefined,
    };

    const publish = readPublish((k) => (raw[k] === undefined || raw[k] === null ? undefined : String(raw[k])));
    if (publish) Object.assign(fields, publish);

    const duration = computeDuration(start, end);
    if (duration !== undefined) fields.duration = duration;

    return { fields, deleteImages: parseDeleteImages(raw.delete_images) };
}

/** Accepts multipart/form-data (with image files) or application/json. */
export async function parseActivity(req: Request): Promise<ParsedActivity> {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
        const form = await req.formData();
        const raw: Record<string, unknown> = {};
        for (const [key, value] of form.entries()) {
            if (key === 'images') continue;
            if (key === 'delete_images') {
                const all = form.getAll('delete_images').map((v) => v.toString());
                raw.delete_images = all.length > 1 ? all : all[0];
                continue;
            }
            raw[key] = value.toString();
        }
        const files = form.getAll('images').filter((f): f is File => f instanceof File);
        const newImages: string[] = [];
        for (const file of files) newImages.push(await uploadFile(file));
        newImages.push(...readImageUrls(raw.image_urls as string | undefined));
        return { ...build(raw), newImages };
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return { ...build(body), newImages: [] };
}
