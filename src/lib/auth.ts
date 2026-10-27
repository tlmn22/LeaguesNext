import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { queryOne } from './db';
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession, type Role } from './session-token';

export type { Role };

const ROLES: Role[] = ['admin', 'commissioner'];

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  league_id: number | null;
};

type UserRow = User & { password_hash: string; status: 'active' | 'inactive' };

/**
 * PHP password_hash() нь "$2y$" угтвартай bcrypt үүсгэдэг. bcryptjs нь "$2a$/$2b$"-г
 * танидаг бөгөөд алгоритм нь ижил тул угтварыг солиход л хангалттай.
 */
function normalizeHash(hash: string): string {
  return hash.startsWith('$2y$') ? '$2b$' + hash.slice(4) : hash;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, normalizeHash(hash));
  } catch {
    return false;
  }
}

/** PHP-тэй нийцтэй "$2y$" bcrypt hash үүсгэнэ (хуучин PHP сайт ч уншиж чадна) */
export async function hashPassword(password: string): Promise<string> {
  const h = await bcrypt.hash(password, 10);
  return '$2y$' + h.slice(4);
}

export async function login(email: string, password: string): Promise<User | null> {
  const u = await queryOne<UserRow>(
    "SELECT id, name, email, role, league_id, password_hash, status FROM users WHERE LOWER(email)=LOWER(?) AND status='active' AND role IN ('admin','commissioner') LIMIT 1",
    [email],
  );
  if (!u || !(await verifyPassword(password, u.password_hash))) return null;

  const token = await signSession({ uid: u.id, role: u.role });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return { id: u.id, name: u.name, email: u.email, role: u.role, league_id: u.league_id };
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/**
 * Одоогийн хэрэглэгч. Хүсэлт бүрт DB-ээс шинээр уншина — ингэснээр идэвхгүй болгосон
 * хэрэглэгч эсвэл өөрчлөгдсөн эрх шууд хүчинтэй болно.
 */
export const getUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const s = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const u = await queryOne<User & { status: string }>(
    'SELECT id, name, email, role, league_id, status FROM users WHERE id=? LIMIT 1',
    [s.uid],
  );
  if (!u || u.status !== 'active' || !ROLES.includes(u.role)) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role, league_id: u.league_id };
});

/** Нэвтрээгүй бол /login руу */
export async function requireUser(): Promise<User> {
  const u = await getUser();
  if (!u) redirect('/login');
  return u;
}

/** Эрх шаардана — эрхгүй бол /admin/forbidden руу */
export async function requireRole(roles: Role[]): Promise<User> {
  const u = await requireUser();
  if (!roles.includes(u.role)) redirect('/admin/forbidden');
  return u;
}

export const isAdmin = (u: User) => u.role === 'admin';
export const isCommissioner = (u: User) => u.role === 'commissioner';

/** Commissioner зөвхөн өөрийн лигийг удирдана */
export function canManageLeague(u: User, leagueId: number | null | undefined): boolean {
  if (isAdmin(u)) return true;
  return isCommissioner(u) && u.league_id != null && Number(u.league_id) === Number(leagueId);
}

export function roleLabel(role: string): string {
  return (
    { admin: 'Админ', commissioner: 'Комиссар' } as Record<string, string>
  )[role] ?? role;
}
