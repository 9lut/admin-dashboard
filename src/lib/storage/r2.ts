import 'server-only';
import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { keyFromUrl } from '../inputs/images';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

let sharp: any = null;
try {
    sharp = require('sharp');
} catch (e) {
    console.warn('⚠️ Sharp module failed to load. Image optimization will be bypassed. (Expected on Windows with Node 26+)');
}

/**
 * Cloudflare R2 storage (S3-compatible), ported from the NestJS CloudflareService.
 * Images are converted to WebP before upload, same as before.
 */
let client: S3Client | null = null;

function s3(): S3Client {
    if (client) return client;
    const { R2_REGION, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_DOMAIN } = process.env;
    if (!R2_REGION || !R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_DOMAIN) {
        throw new Error('Missing required Cloudflare R2 environment variables');
    }
    client = new S3Client({
        region: R2_REGION,
        endpoint: R2_ENDPOINT,
        credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    });
    return client;
}

/** Upload an image buffer as WebP (if sharp is available), returns the public URL. */
export async function uploadImage(buffer: Buffer): Promise<string> {
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) {
        throw new Error('Image must be between 1 byte and 10 MB');
    }
    const isSharpAvailable = !!sharp;
    const key = `${uuidv4()}.${isSharpAvailable ? 'webp' : 'jpg'}`;
    const body = isSharpAvailable ? await sharp(buffer).webp({ quality: 100 }).toBuffer() : buffer;
    const contentType = isSharpAvailable ? 'image/webp' : 'image/jpeg';

    await s3().send(
        new PutObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: key,
            Body: body,
            ContentType: contentType,
        }),
    );

    return `${process.env.R2_PUBLIC_DOMAIN}/${key}`;
}

/** Convenience helper for a Web API File (from route handler formData). */
export async function uploadFile(file: File): Promise<string> {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error('Unsupported image type');
    if (file.size === 0 || file.size > MAX_IMAGE_BYTES) throw new Error('Image must be between 1 byte and 10 MB');
    const buffer = Buffer.from(await file.arrayBuffer());
    return uploadImage(buffer);
}


/**
 * ลบหลายไฟล์ในคำขอเดียว (R2 รองรับสูงสุด 1,000 key ต่อครั้ง) — คืนจำนวนที่ลบไม่สำเร็จ
 * ไม่ throw: รูปค้างใน R2 ไม่ควรทำให้การลบข้อมูลล้มเหลว
 */
export async function deleteFiles(fileUrls: string[]): Promise<number> {
    const keys = [...new Set(fileUrls.map(keyFromUrl).filter((k): k is string => !!k))];
    let failed = 0;
    for (let i = 0; i < keys.length; i += 1000) {
        const chunk = keys.slice(i, i + 1000);
        try {
            const res = await s3().send(
                new DeleteObjectsCommand({
                    Bucket: process.env.R2_BUCKET,
                    Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
                }),
            );
            failed += res.Errors?.length ?? 0;
            for (const e of res.Errors ?? []) console.error(`Failed to delete file from R2: ${e.Key}`, e.Message);
        } catch (error) {
            failed += chunk.length;
            console.error('Failed to batch-delete files from R2', error);
        }
    }
    return failed;
}

/** ทุกไฟล์ใน bucket (ไล่ทุกหน้า สูงสุด 50,000 ไฟล์) — ใช้วัดพื้นที่และคลังรูป */
export async function listAllObjects(): Promise<{ key: string; size: number; uploadedAt: string }[]> {
    const out: { key: string; size: number; uploadedAt: string }[] = [];
    let token: string | undefined;
    do {
        const res = await s3().send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET, ContinuationToken: token, MaxKeys: 1000 }));
        for (const o of res.Contents ?? []) if (o.Key) out.push({ key: o.Key, size: o.Size ?? 0, uploadedAt: (o.LastModified ?? new Date(0)).toISOString() });
        token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token && out.length < 50000);
    return out;
}

/** Delete a file by its public URL. Logs (does not throw) on failure. */
export async function deleteFile(fileUrl: string): Promise<void> {
    const key = fileUrl.split('/').pop();
    if (!key) {
        console.warn(`Invalid file URL for deletion: ${fileUrl}`);
        return;
    }
    try {
        await s3().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }));
    } catch (error) {
        console.error(`Failed to delete file from R2: ${key}`, error);
    }
}
