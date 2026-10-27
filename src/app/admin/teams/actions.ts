'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { execute, queryOne, scalar } from '@/lib/db';
import { flashRedirect } from '@/lib/flash';
import { int, intOrNull, oneOf, str } from '@/lib/form';
import { UploadError, deleteUpload, saveImage } from '@/lib/upload';

export async function saveTeam(fd: FormData) {
  const user = await requireRole(['admin', 'commissioner']);
  const id = intOrNull(fd, 'id');
  const back = id ? `/admin/teams/${id}` : '/admin/teams/new';
  const name = str(fd, 'name');
  const shortName = str(fd, 'short_name').slice(0, 20);
  const city = str(fd, 'city');
  const gender = oneOf(str(fd, 'gender'), ['M', 'F', 'Mixed'] as const, 'M');
  const colorRaw = str(fd, 'primary_color');
  const color = /^#[0-9a-fA-F]{6}$/.test(colorRaw) ? colorRaw : null;
  const description = str(fd, 'description') || null;
  if (!name) return flashRedirect('danger', 'Багийн нэр заавал шаардлагатай.', back);

  let logo: string | null;
  try {
    logo = await saveImage(fd.get('logo'), 'teams', 'team');
  } catch (e) {
    if (e instanceof UploadError) return flashRedirect('danger', e.message, back);
    throw e;
  }

  if (id) {
    const old = await queryOne<{ logo_path: string | null }>('SELECT logo_path FROM teams WHERE id=?', [id]);
    if (!old) return flashRedirect('danger', 'Баг олдсонгүй.', '/admin/teams');
    await execute(
      `UPDATE teams SET name=?, short_name=?, city=?, gender=?, primary_color=?, description=?, updated_by_user_id=?${logo ? ', logo_path=?' : ''} WHERE id=?`,
      [name, shortName, city, gender, color, description, user.id, ...(logo ? [logo] : []), id],
    );
    if (logo) await deleteUpload(old.logo_path);
  } else {
    await execute('INSERT INTO teams (name, short_name, city, gender, primary_color, description, logo_path, created_by_user_id) VALUES (?,?,?,?,?,?,?,?)', [
      name, shortName, city, gender, color, description, logo, user.id,
    ]);
  }
  revalidatePath('/', 'layout');
  return flashRedirect('success', id ? `"${name}" багийг амжилттай заслаа.` : `"${name}" баг амжилттай нэмэгдлээ.`, '/admin/teams');
}

export async function deleteTeam(fd: FormData) {
  await requireRole(['admin', 'commissioner']);
  const id = int(fd, 'id');
  const team = await queryOne<{ name: string; logo_path: string | null }>('SELECT name, logo_path FROM teams WHERE id=?', [id]);
  if (!team) return flashRedirect('danger', 'Баг олдсонгүй.', '/admin/teams');
  if (Number(await scalar('SELECT COUNT(*) FROM season_teams WHERE team_id=?', [id])) > 0)
    return flashRedirect('danger', `"${team.name}" баг улиралд бүртгэлтэй байна. Эхлээд улирлаас хасна уу.`, '/admin/teams');
  await execute('DELETE FROM teams WHERE id=?', [id]);
  await deleteUpload(team.logo_path);
  revalidatePath('/', 'layout');
  return flashRedirect('success', `"${team.name}" баг устгагдлаа.`, '/admin/teams');
}
