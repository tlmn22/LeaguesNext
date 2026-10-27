import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session-token';

// POST — CSRF-ээр гаргахаас сэргийлнэ (GET-ээр гаргах линкийг зөвшөөрөхгүй)
export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL('/login', req.url), 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

// Хуучин /logout.php холбоос — login руу шилжүүлнэ, гаргахгүй
export async function GET(req: Request) {
  return NextResponse.redirect(new URL('/login', req.url));
}
