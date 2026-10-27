'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { login } from '@/lib/auth';

export type LoginState = { error: string; email: string };

// Brute-force-оос хамгаалах энгийн хязгаарлалт (нэг процесс дотор, IP+email-ээр)
const attempts = new Map<string, { n: number; until: number }>();
const MAX = 8;
const WINDOW = 10 * 60 * 1000;

export async function loginAction(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const email = String(fd.get('email') ?? '').trim();
  const password = String(fd.get('password') ?? '');
  const next = String(fd.get('next') ?? '');
  if (!email || !password) return { error: 'Бүх талбарыг бөглөнө үү.', email };

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const key = `${ip}|${email.toLowerCase()}`;
  const a = attempts.get(key);
  if (a && a.n >= MAX && a.until > Date.now()) {
    return { error: 'Хэт олон удаа буруу оролдлоо. 10 минутын дараа дахин оролдоно уу.', email };
  }

  const user = await login(email, password);
  if (!user) {
    const cur = a && a.until > Date.now() ? a : { n: 0, until: Date.now() + WINDOW };
    attempts.set(key, { n: cur.n + 1, until: cur.until });
    return { error: 'И-мэйл эсвэл нууц үг буруу байна.', email };
  }
  attempts.delete(key);
  // Зөвхөн дотоод /admin зам руу буцаана (open redirect-ээс сэргийлнэ)
  redirect(next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin');
}
