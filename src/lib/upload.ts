import 'server-only';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';

/** uploads/ хавтасны бодит зам (DB-д "uploads/<dir>/<file>" гэж хадгалагдана) */
export function uploadRoot(): string {
  return path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');
}

const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_BYTES = 8 * 1024 * 1024;

// Файлын эхний байтуудаар бодит зураг мөн эсэхийг шалгана (өргөтгөл хуурахаас сэргийлнэ)
function looksLikeImage(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true; // jpg
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return true; // png
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return true;
  if (buf.subarray(0, 3).toString('ascii') === 'GIF') return true;
  return false;
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export class UploadError extends Error {}

/**
 * Зураг хадгалах. Файл сонгоогүй бол null буцаана.
 * @returns "uploads/<dir>/<prefix>_YYYYmmdd_HHMMSS_xxxxxxxx.ext"
 */
export async function saveImage(file: FormDataEntryValue | null, dir: 'leagues' | 'teams' | 'players' | 'news', prefix: string): Promise<string | null> {
  if (!file || typeof file === 'string' || file.size === 0) return null;
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  if (!IMAGE_EXT.includes(ext)) throw new UploadError('Зөвхөн JPG, PNG, WEBP, GIF формат зөвшөөрнө.');
  if (file.size > MAX_BYTES) throw new UploadError('Зургийн хэмжээ 8MB-аас ихгүй байх ёстой.');
  const buf = Buffer.from(await file.arrayBuffer());
  if (!looksLikeImage(buf)) throw new UploadError('Файл зураг биш байна.');

  const name = `${prefix}_${stamp()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
  const absDir = path.join(uploadRoot(), dir);
  await fs.mkdir(absDir, { recursive: true });
  await fs.writeFile(path.join(absDir, name), buf);
  return `uploads/${dir}/${name}`;
}

/** Хуучин файлыг устгана (алдаа гарвал чимээгүй алгасна) */
export async function deleteUpload(rel: string | null | undefined): Promise<void> {
  if (!rel) return;
  const clean = String(rel).replace(/^\/+/, '').replace(/^uploads\//, '');
  const abs = path.resolve(uploadRoot(), clean);
  if (!abs.startsWith(uploadRoot() + path.sep)) return;
  await fs.unlink(abs).catch(() => {});
}
