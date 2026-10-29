'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { execute, queryOne } from '@/lib/db';
import { flashRedirect } from '@/lib/flash';
import { int, oneOf, str } from '@/lib/form';
import { canSeason } from '@/lib/scope';
import { UploadError, deleteUpload, saveImage } from '@/lib/upload';

const TIERS = ['title', 'sponsor', 'partner'] as const;

export async function addSponsor(fd: FormData) {
  const user = await requireRole(['admin', 'commissioner']);
  const seasonId = int(fd, 'season_id');
  const back = `/admin/seasons/${seasonId}?tab=sponsors`;
  if (!(await canSeason(user, seasonId))) return flashRedirect('danger', 'Эрхгүй.', back);

  const name = str(fd, 'name').slice(0, 120);
  const rawUrl = str(fd, 'url');
  // Зөвхөн http(s) холбоос — javascript: зэргээс сэргийлнэ
  const url = /^https?:\/\/\S+$/i.test(rawUrl) ? rawUrl.slice(0, 255) : null;
  if (!name) return flashRedirect('danger', 'Байгууллагын нэр заавал шаардлагатай.', back);
  if (rawUrl && !url) return flashRedirect('danger', 'Вэбсайт http:// эсвэл https://-ээр эхлэх ёстой.', back);

  let logo: string | null;
  try {
    logo = await saveImage(fd.get('logo'), 'sponsors', 'sponsor');
  } catch (e) {
    if (e instanceof UploadError) return flashRedirect('danger', e.message, back);
    throw e;
  }
  await execute('INSERT INTO season_sponsors (season_id, name, logo, url, tier, sort_order) VALUES (?,?,?,?,?,?)', [
    seasonId, name, logo, url, oneOf(str(fd, 'tier'), TIERS, 'sponsor'), int(fd, 'sort_order', 0),
  ]);
  revalidatePath('/', 'layout');
  return flashRedirect('success', `"${name}" нэмэгдлээ.`, back);
}

export async function deleteSponsor(fd: FormData) {
  const user = await requireRole(['admin', 'commissioner']);
  const id = int(fd, 'id');
  const sp = await queryOne<{ season_id: number; name: string; logo: string | null }>('SELECT season_id, name, logo FROM season_sponsors WHERE id=?', [id]);
  if (!sp) return flashRedirect('danger', 'Олдсонгүй.', '/admin/seasons');
  const back = `/admin/seasons/${sp.season_id}?tab=sponsors`;
  if (!(await canSeason(user, sp.season_id))) return flashRedirect('danger', 'Эрхгүй.', back);
  await execute('DELETE FROM season_sponsors WHERE id=?', [id]);
  await deleteUpload(sp.logo);
  revalidatePath('/', 'layout');
  return flashRedirect('success', `"${sp.name}" хасагдлаа.`, back);
}
