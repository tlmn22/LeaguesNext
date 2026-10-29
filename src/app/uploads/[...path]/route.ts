import path from 'node:path';
import fs from 'node:fs/promises';
import { uploadRoot } from '@/lib/upload';
import { MIME, publicUrl, storageEnabled } from '@/lib/storage';

// Runtime-д upload хийгдсэн файлуудыг public/-оос үйлчлэх боломжгүй (Next зөвхөн build-ийн
// үеийн файлыг өгдөг). Supabase Storage тохируулсан бол тэнд руу шилжүүлнэ, үгүй бол
// UPLOAD_DIR-оос шууд уншиж өгнө. DB дахь "uploads/..." зам хоёр тохиолдолд ижил.
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  const segs = parts.map((p) => decodeURIComponent(p));
  if (segs.some((s) => !s || s === '.' || s === '..' || s.includes('\\'))) return new Response('Not found', { status: 404 });

  const ext = path.extname(segs[segs.length - 1]).slice(1).toLowerCase();
  const type = MIME[ext];
  if (!type) return new Response('Not found', { status: 404 });

  if (storageEnabled()) {
    return new Response(null, {
      status: 308,
      headers: { Location: publicUrl(segs.join('/')), 'Cache-Control': 'public, max-age=86400' },
    });
  }

  const root = uploadRoot();
  const abs = path.resolve(root, ...segs);
  if (!abs.startsWith(root + path.sep)) return new Response('Not found', { status: 404 });
  try {
    const buf = await fs.readFile(abs);
    const headers: Record<string, string> = {
      'Content-Type': type,
      // Файлын нэр давтагдашгүй (timestamp + random) тул удаан кэшлэж болно
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    };
    // SVG дотор script байж болзошгүй — sandbox хийнэ
    if (ext === 'svg') headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
    return new Response(new Uint8Array(buf), { headers });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
