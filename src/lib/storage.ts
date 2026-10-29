// Supabase Storage (REST) — upload хийсэн зургууд. Vercel-ийн файлын систем зөвхөн уншигдах тул
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY тохируулсан орчинд зургийг bucket-д хадгална.
// Түлхүүр зөвхөн сервер талд уншигдана (NEXT_PUBLIC_ биш). scripts/ ч ашигладаг тул 'server-only' импортгүй.

export const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

export const storageEnabled = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const base = () => String(process.env.SUPABASE_URL).replace(/\/+$/, '') + '/storage/v1';

function auth(): Record<string, string> {
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return { Authorization: `Bearer ${key}`, apikey: key };
}

/** DB-ийн "uploads/teams/x.png" эсвэл "/uploads/..." → bucket доторх "teams/x.png" */
export const objectKey = (rel: string) => String(rel).replace(/^\/+/, '').replace(/^uploads\//, '');

const encodeKey = (key: string) => key.split('/').map(encodeURIComponent).join('/');

export const publicUrl = (key: string) => `${base()}/object/public/${BUCKET}/${encodeKey(key)}`;

export async function putObject(key: string, body: Uint8Array, contentType: string): Promise<void> {
  const res = await fetch(`${base()}/object/${BUCKET}/${encodeKey(key)}`, {
    method: 'POST',
    headers: { ...auth(), 'Content-Type': contentType, 'x-upsert': 'true', 'Cache-Control': 'max-age=31536000' },
    body: body as BodyInit,
  });
  if (!res.ok) throw new Error(`Storage upload ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export async function removeObject(key: string): Promise<void> {
  await fetch(`${base()}/object/${BUCKET}`, {
    method: 'DELETE',
    headers: { ...auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: [key] }),
  }).catch(() => {});
}

/** Нийтийн bucket байхгүй бол үүсгэнэ */
export async function ensureBucket(): Promise<'created' | 'exists'> {
  const got = await fetch(`${base()}/bucket/${BUCKET}`, { headers: auth() });
  if (got.ok) return 'exists';
  const res = await fetch(`${base()}/bucket`, {
    method: 'POST',
    headers: { ...auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: true,
      file_size_limit: 8 * 1024 * 1024,
      allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'application/pdf'],
    }),
  });
  if (!res.ok) throw new Error(`Bucket үүсгэж чадсангүй ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return 'created';
}

export const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
};
