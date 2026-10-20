import 'server-only';
import { uploadFile } from '../storage/r2';
import type { PrayerRoomFields } from '../repositories/prayerRoomRepo';
import { readImageUrls } from '../http/content';

export type ParsedPrayerRoom = {
    fields: PrayerRoomFields;
    newImages: string[];
    deleteImages: string[];
};

function maybeJson<T>(v: unknown): T | undefined {
    if (v === undefined || v === null || v === '') return undefined;
    if (typeof v === 'string') {
        try {
            return JSON.parse(v) as T;
        } catch {
            return v as unknown as T;
        }
    }
    return v as T;
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

function build(raw: Record<string, unknown>): Omit<ParsedPrayerRoom, 'newImages'> {
    const fields: PrayerRoomFields = {
        name: raw.name as string | undefined,
        name_th: raw.name_th as string | undefined,
        name_en: raw.name_en as string | undefined,
        slug: raw.slug as string | undefined,
        place: raw.place as string | undefined,
        detail: raw.detail as string | undefined,
        faculty: raw.faculty as string | undefined,
        location: maybeJson<number[]>(raw.location),
        openingHours: raw.openingHours as string | undefined,
        youtube_url: raw.youtube_url as string | undefined,
        capacity: raw.capacity !== undefined && raw.capacity !== '' ? Number(raw.capacity) : undefined,
        google_map_url: raw.google_map_url as string | undefined,
        facilities: maybeJson<string[]>(raw.facilities),
        phone: raw.phone as string | undefined,
    };
    return { fields, deleteImages: parseDeleteImages(raw.delete_images) };
}

export async function parsePrayerRoom(req: Request): Promise<ParsedPrayerRoom> {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
        const form = await req.formData();
        const raw: Record<string, unknown> = {};
        for (const [key, value] of form.entries()) {
            if (key === 'images' || key === 'facilities' || key === 'delete_images') continue;
            if (key.startsWith('location[')) continue; // handled below
            raw[key] = value.toString();
        }

        // facilities: repeated fields (create) OR a single JSON array string (update).
        // Normalise to a JSON array string so build()'s maybeJson always yields string[].
        const fac = form.getAll('facilities').map((v) => v.toString());
        if (fac.length === 1) {
            let parsed: unknown;
            try {
                parsed = JSON.parse(fac[0]);
            } catch {
                parsed = undefined;
            }
            raw.facilities = Array.isArray(parsed) ? fac[0] : JSON.stringify([fac[0]]);
        } else if (fac.length > 1) {
            raw.facilities = JSON.stringify(fac);
        }

        // location: "location" JSON (update) OR bracket fields location[0]/location[1] (create)
        if (!raw.location) {
            const lat = form.get('location[0]');
            const lng = form.get('location[1]');
            if (lat != null && lng != null) raw.location = [Number(lat), Number(lng)];
        }

        // delete_images: JSON array string OR repeated fields
        const del = form.getAll('delete_images').map((v) => v.toString());
        if (del.length) raw.delete_images = del.length > 1 ? del : del[0];

        const files = form.getAll('images').filter((f): f is File => f instanceof File);
        const newImages: string[] = [];
        for (const file of files) newImages.push(await uploadFile(file));
        newImages.push(...readImageUrls(raw.image_urls as string | undefined));
        return { ...build(raw), newImages };
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return { ...build(body), newImages: [] };
}
