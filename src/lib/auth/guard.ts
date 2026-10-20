import 'server-only';
import { getSessionCookie } from './cookies';
import { verifySession, type SessionUser } from './firebase';
import { Unauthorized, Forbidden } from '../http/response';
import { accountRepo } from '../repositories/accountRepo';
import { permissionRepo } from '../repositories/permissionRepo';
import { allowedMenus } from '../access/menus';

// `sub` is kept as an alias of `uid` so existing call sites keep working.
export type AuthUser = SessionUser & { sub: string };

/** Resolve the authenticated user from the Firebase session cookie (401 if invalid). */
export async function requireAuth(): Promise<AuthUser> {
    const cookie = await getSessionCookie();
    if (!cookie) throw Unauthorized('Missing session');
    try {
        const user = await verifySession(cookie);
        return { ...user, sub: user.uid };
    } catch {
        throw Unauthorized('Invalid or expired session');
    }
}

/** Require auth AND one of the given roles (via the `role` custom claim). */
export async function requireRole(...roles: string[]): Promise<AuthUser> {
    const user = await requireAuth();
    if (roles.length && !roles.includes(user.role)) {
        throw Forbidden('Insufficient role permissions');
    }
    return user;
}

/** Enforce the same department menu permission on the server as in the UI (lib/access/menus.ts). */
export async function requireMenuPermission(href: string): Promise<AuthUser> {
    const user = await requireAuth();
    if (user.role === Role.SUPERADMIN) return user;
    const [account, settings] = await Promise.all([accountRepo.findOne(user.uid), permissionRepo.getSettings()]);
    const allowed = allowedMenus(user.role, account.departments as string[] | undefined, settings.departments);
    if (!allowed.has(href)) throw Forbidden('Insufficient menu permissions');
    return user;
}

export const Role = {
    USER: 'user',
    ADMIN: 'admin',
    SUPERADMIN: 'superadmin',
} as const;
