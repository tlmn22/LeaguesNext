// Edge (middleware) болон Node хоёуланд ажиллах ёстой тул энд DB/server-only импорт хийхгүй
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'lm_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 хоног

export type Role = 'admin' | 'commissioner';

export type SessionPayload = {
  uid: number;
  role: Role;
};

function secretKey(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error('SESSION_SECRET тохируулаагүй эсвэл хэт богино байна (32+ тэмдэгт).');
  }
  return new TextEncoder().encode(s);
}

export async function signSession(p: SessionPayload): Promise<string> {
  return new SignJWT({ uid: p.uid, role: p.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    if (typeof payload.uid !== 'number' || typeof payload.role !== 'string') return null;
    return { uid: payload.uid, role: payload.role as Role };
  } catch {
    return null;
  }
}
