import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logMutation } from './systemLogging';
import { clearCache } from '../cache';

// แคชรายการที่ต้องล้างเมื่อมีการแก้ไขข้อมูล (เดิมไม่ล้าง → ลบแล้วรายการเก่ายังค้างได้ถึง 2 นาที)
const CACHE_BY_PATH: [string, string[]][] = [
    ['/api/news', ['api_news', 'dashboard']],
    ['/api/activities', ['api_activities', 'dashboard']],
    ['/api/prayer-rooms', ['api_prayer_rooms', 'dashboard']],
    ['/api/blog', ['dashboard']],
    ['/api/accounts', ['dashboard']],
];

function invalidateFor(req: Request, status: number) {
    if (status >= 400 || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase())) return;
    const path = new URL(req.url).pathname;
    for (const [prefix, keys] of CACHE_BY_PATH) {
        if (path.startsWith(prefix)) keys.forEach((k) => clearCache(k));
    }
}

export interface ApiSuccess<T> {
    status: 'success';
    message: string;
    status_code: number;
    data: T;
}

export interface ApiFailure {
    status: 'fail';
    message: string;
    status_code: number;
    data: null;
    errors?: unknown;
}

/**
 * Response envelope compatible with the previous NestJS backend:
 *   success -> { status: 'success', message, status_code, data }
 *   fail    -> { status: 'fail', message, status_code, data: null, errors? }
 *
 * The frontend services depend on this exact shape, so keep it stable.
 */
export function ok<T>(data: T, message = 'OK', statusCode = 200): NextResponse<ApiSuccess<T>> {
    return NextResponse.json(
        { status: 'success', message, status_code: statusCode, data },
        { status: statusCode },
    );
}

export function failBody(message: string, statusCode = 400, errors?: unknown): NextResponse<ApiFailure> {
    return NextResponse.json(
        { status: 'fail', message, status_code: statusCode, data: null, ...(errors ? { errors } : {}) },
        { status: statusCode },
    );
}

/** Throwable HTTP error, mirrors Nest's HttpException family. */
export class ApiError extends Error {
    statusCode: number;
    constructor(message: string, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
}

export const Unauthorized = (m = 'Unauthorized') => new ApiError(m, 401);
export const Forbidden = (m = 'Forbidden') => new ApiError(m, 403);
export const NotFound = (m = 'Not found') => new ApiError(m, 404);
export const BadRequest = (m = 'Bad request') => new ApiError(m, 400);
export const TooManyRequests = (m = 'Too many requests') => new ApiError(m, 429);

/**
 * Wrap a route handler so thrown ApiError / ZodError become the standard
 * fail envelope, mirroring the old AllExceptionsFilter.
 */
export function handle(
    fn: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>,
) {
    return async (req: Request, ctx: { params: Promise<Record<string, string>> }): Promise<Response> => {
        try {
            const res = await fn(req, ctx);
            invalidateFor(req, res.status);
            // Auto-log successful mutations (replaces the old SystemLogInterceptor).
            // Logging must never break the actual response.
            try {
                const params = ctx?.params ? await ctx.params.catch(() => undefined) : undefined;
                await logMutation(req, params, res.status);
            } catch (logErr) {
                console.error('[api] auto-log failed:', logErr);
            }
            return res;
        } catch (err) {
            if (err instanceof ZodError) {
                const errors = err.issues.map((i) => ({
                    field: i.path.join('.'),
                    errors: [i.message],
                }));
                return failBody('Validation failed', 400, errors);
            }
            if (err instanceof ApiError) {
                return failBody(err.message, err.statusCode);
            }
            if (err instanceof SyntaxError) {
                return failBody('Malformed JSON request body', 400);
            }
            console.error('[api] unhandled error:', err);
            return failBody('Internal server error', 500);
        }
    };
}
