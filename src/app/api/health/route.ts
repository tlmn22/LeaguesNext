import { NextResponse } from 'next/server';
import { scalar } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Deploy шалгах: DB холболтын төлөв. Нууц мэдээлэл (URL, нууц үг) буцаахгүй — зөвхөн алдааны код. */
export async function GET() {
  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    SESSION_SECRET: (process.env.SESSION_SECRET?.length ?? 0) >= 32,
  };
  try {
    await scalar('SELECT 1');
    return NextResponse.json({ ok: true, env });
  } catch (e) {
    const err = e as Error & { code?: string };
    const kind = !env.DATABASE_URL ? 'DATABASE_URL missing' : err.code ?? err.name;
    console.error('[health]', kind, err.message);
    return NextResponse.json({ ok: false, env, error: kind }, { status: 503 });
  }
}
