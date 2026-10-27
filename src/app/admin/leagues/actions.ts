'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { execute, queryOne, scalar } from '@/lib/db';
import { flashRedirect } from '@/lib/flash';
import { int, intOrNull, str } from '@/lib/form';
import { UploadError, deleteUpload, saveImage } from '@/lib/upload';

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function saveLeague(fd: FormData) {
  const user = await requireRole(['admin']);
  const id = intOrNull(fd, 'id');
  const back = id ? `/admin/leagues/${id}` : '/admin/leagues/new';

  const name = str(fd, 'name');
  const tier = Math.min(3, Math.max(1, int(fd, 'tier', 2)));
  let slug = slugify(str(fd, 'slug')) || slugify(name);
  const location = str(fd, 'location');
  const description = str(fd, 'description');
  const commissioner = intOrNull(fd, 'commissioner_user_id');
  const colorRaw = str(fd, 'primary_color');
  const color = /^#[0-9a-fA-F]{6}$/.test(colorRaw) ? colorRaw : '#E8601C';

  if (!name) return flashRedirect('danger', 'Лигийн нэр заавал шаардлагатай.', back);
  // Кирилл нэрнээс slug гарахгүй бол автоматаар үүсгэнэ
  if (!slug) slug = `league-${Date.now().toString(36)}`;
  if (await scalar('SELECT COUNT(*) FROM leagues WHERE slug=? AND id<>?', [slug, id ?? 0])) {
    return flashRedirect('danger', `"${slug}" slug аль хэдийн ашиглагдсан байна.`, back);
  }

  let logo: string | null;
  try {
    logo = await saveImage(fd.get('logo'), 'leagues', 'league');
  } catch (e) {
    if (e instanceof UploadError) return flashRedirect('danger', e.message, back);
    throw e;
  }

  let leagueId = id;
  if (id) {
    const old = await queryOne<{ logo: string | null }>('SELECT logo FROM leagues WHERE id=?', [id]);
    if (!old) return flashRedirect('danger', 'Лиг олдсонгүй.', '/admin/leagues');
    await execute(
      `UPDATE leagues SET name=?, tier=?, slug=?, location=?, description=?, commissioner_user_id=?, primary_color=?${logo ? ', logo=?' : ''} WHERE id=?`,
      logo
        ? [name, tier, slug, location, description, commissioner, color, logo, id]
        : [name, tier, slug, location, description, commissioner, color, id],
    );
    if (logo) await deleteUpload(old.logo);
  } else {
    const r = await execute(
      'INSERT INTO leagues (name, tier, slug, location, description, commissioner_user_id, logo, primary_color, created_by) VALUES (?,?,?,?,?,?,?,?,?)',
      [name, tier, slug, location, description, commissioner, logo, color, user.id],
    );
    leagueId = r.insertId;
  }
  if (commissioner) await execute('UPDATE users SET league_id=? WHERE id=?', [leagueId, commissioner]);

  revalidatePath('/', 'layout');
  return flashRedirect('success', id ? `"${name}" лигийг амжилттай заслаа.` : `"${name}" лиг амжилттай нэмэгдлээ.`, '/admin/leagues');
}

export async function deleteLeague(fd: FormData) {
  await requireRole(['admin']);
  const id = int(fd, 'id');
  const lg = await queryOne<{ name: string; logo: string | null }>('SELECT name, logo FROM leagues WHERE id=?', [id]);
  if (!lg) return flashRedirect('danger', 'Лиг олдсонгүй.', '/admin/leagues');

  // DB-д FK cascade байхгүй тул улиралтай лигийг устгахыг хориглоно (өнчин өгөгдөл үлдэхээс сэргийлнэ)
  const seasons = Number(await scalar('SELECT COUNT(*) FROM seasons WHERE league_id=?', [id]));
  if (seasons > 0) return flashRedirect('danger', `"${lg.name}" лигт ${seasons} улирал байна. Эхлээд улирлуудыг устгана уу.`, '/admin/leagues');

  await execute('UPDATE users SET league_id=NULL WHERE league_id=?', [id]);
  await execute('DELETE FROM leagues WHERE id=?', [id]);
  await deleteUpload(lg.logo);
  revalidatePath('/', 'layout');
  return flashRedirect('success', `"${lg.name}" лиг устгагдлаа.`, '/admin/leagues');
}
