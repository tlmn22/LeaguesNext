'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { execute, queryOne, scalar } from '@/lib/db';
import { flashRedirect } from '@/lib/flash';
import { int, intOrNull, isDate, oneOf, str } from '@/lib/form';
import { UploadError, deleteUpload, saveImage } from '@/lib/upload';

export async function savePlayer(fd: FormData) {
  const user = await requireRole(['admin', 'commissioner']);
  const id = intOrNull(fd, 'id');
  const back = id ? `/admin/players/${id}` : '/admin/players/new';
  const last = str(fd, 'last_name');
  const first = str(fd, 'first_name');
  if (!last || !first) return flashRedirect('danger', 'Овог нэр заавал шаардлагатай.', back);
  const birth = str(fd, 'birth_date');
  const vals = [
    last, first,
    oneOf(str(fd, 'gender'), ['M', 'F', 'O'] as const, 'M'),
    oneOf(str(fd, 'hand'), ['R', 'L'] as const, 'R'),
    isDate(birth) ? birth : null,
    intOrNull(fd, 'height_cm'), intOrNull(fd, 'weight_kg'),
    str(fd, 'phone').slice(0, 20), str(fd, 'school_name').slice(0, 100),
  ];

  let photo: string | null;
  try {
    photo = await saveImage(fd.get('photo'), 'players', 'player');
  } catch (e) {
    if (e instanceof UploadError) return flashRedirect('danger', e.message, back);
    throw e;
  }

  if (id) {
    const old = await queryOne<{ photo_path: string | null }>('SELECT photo_path FROM players WHERE id=?', [id]);
    if (!old) return flashRedirect('danger', 'Тоглогч олдсонгүй.', '/admin/players');
    await execute(
      `UPDATE players SET last_name=?, first_name=?, gender=?, hand=?, birth_date=?, height_cm=?, weight_kg=?, phone=?, school_name=?, updated_by_user_id=?${photo ? ', photo_path=?' : ''} WHERE id=?`,
      [...vals, user.id, ...(photo ? [photo] : []), id],
    );
    if (photo) await deleteUpload(old.photo_path);
  } else {
    await execute(
      'INSERT INTO players (last_name, first_name, gender, hand, birth_date, height_cm, weight_kg, phone, school_name, photo_path, created_by_user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [...vals, photo, user.id],
    );
  }
  revalidatePath('/', 'layout');
  return flashRedirect('success', `${last} ${first} ${id ? 'амжилттай засагдлаа' : 'амжилттай нэмэгдлээ'}.`, '/admin/players');
}

export async function deletePlayer(fd: FormData) {
  await requireRole(['admin', 'commissioner']);
  const id = int(fd, 'id');
  const p = await queryOne<{ last_name: string; first_name: string; photo_path: string | null }>('SELECT last_name, first_name, photo_path FROM players WHERE id=?', [id]);
  if (!p) return flashRedirect('danger', 'Тоглогч олдсонгүй.', '/admin/players');
  const name = `${p.last_name} ${p.first_name}`;
  if (Number(await scalar('SELECT COUNT(*) FROM team_season_roster WHERE player_id=?', [id])) > 0)
    return flashRedirect('danger', `${name} тоглогч roster-т бүртгэлтэй байна. Эхлээд roster-оос хасна уу.`, '/admin/players');
  if (Number(await scalar('SELECT COUNT(*) FROM match_player_stats WHERE player_id=?', [id])) > 0)
    return flashRedirect('danger', `${name} тоглогчид тоглолтын статистик байна. Устгах боломжгүй.`, '/admin/players');
  await execute('DELETE FROM players WHERE id=?', [id]);
  await deleteUpload(p.photo_path);
  revalidatePath('/', 'layout');
  return flashRedirect('success', `${name} устгагдлаа.`, '/admin/players');
}
