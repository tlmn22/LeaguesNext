'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { execute, queryOne, scalar, transaction } from '@/lib/db';
import { flashRedirect } from '@/lib/flash';
import { int, intOrNull, isDate, oneOf, str } from '@/lib/form';
import { todayUB } from '@/lib/format';
import { canSeasonTeam } from '@/lib/scope';
import { UploadError, deleteUpload, saveImage } from '@/lib/upload';

const GENDERS = ['M', 'F', 'O'] as const;

type STInfo = { id: number; team_id: number; season_id: number };

async function stInfo(stid: number) {
  return queryOne<STInfo>('SELECT id, team_id, season_id FROM season_teams WHERE id=?', [stid]);
}

/** Тухайн улиралд өөр багт идэвхтэй байгаа эсэх */
async function conflictTeam(seasonId: number, playerId: number, stid: number) {
  return scalar<string>(
    `SELECT t.name FROM team_season_roster tsr
     JOIN season_teams st2 ON st2.id=tsr.season_team_id
     JOIN teams t ON t.id=st2.team_id
     WHERE st2.season_id=? AND tsr.player_id=? AND tsr.status='active' AND st2.id<>? LIMIT 1`,
    [seasonId, playerId, stid],
  );
}

export async function rosterAddExisting(fd: FormData) {
  const user = await requireRole(['admin', 'commissioner']);
  const stid = int(fd, 'season_team_id');
  const back = `/admin/season-teams/${stid}`;
  const playerId = int(fd, 'player_id');
  if (!stid || !playerId) return flashRedirect('danger', 'Тоглогч сонгоно уу.', back);
  if (!(await canSeasonTeam(user, stid))) return flashRedirect('danger', 'Эрхгүй.', back);
  const st = await stInfo(stid);
  if (!st) return flashRedirect('danger', 'Баг олдсонгүй.', '/admin/seasons');

  const pname = await scalar<string>("SELECT CONCAT(last_name,' ',first_name) FROM players WHERE id=?", [playerId]);
  const other = await conflictTeam(st.season_id, playerId, stid);
  if (other) return flashRedirect('danger', `"${pname}" энэ улиралд "${other}" багт идэвхтэй байна. Эхлээд тэр багаас гаргана уу.`, back);

  const jersey = str(fd, 'jersey_no') || null;
  const position = str(fd, 'position') || null;
  const joined = isDate(str(fd, 'joined_at')) ? str(fd, 'joined_at') : todayUB();
  const captain = fd.get('is_captain') ? 1 : 0;

  const ex = await queryOne<{ id: number; status: string }>('SELECT id, status FROM team_season_roster WHERE season_team_id=? AND player_id=?', [stid, playerId]);
  if (ex?.status === 'active') return flashRedirect('danger', 'Тоглогч аль хэдийн энэ багт бүртгэлтэй байна.', back);
  if (ex) {
    await execute("UPDATE team_season_roster SET status='active', jersey_no=?, position=?, is_captain=?, joined_at=?, left_at=NULL, updated_at=app_now() WHERE id=?", [
      jersey, position, captain, joined, ex.id,
    ]);
  } else {
    await execute("INSERT INTO team_season_roster (season_team_id, team_id, player_id, jersey_no, position, is_captain, status, joined_at) VALUES (?,?,?,?,?,?,'active',?)", [
      stid, st.team_id, playerId, jersey, position, captain, joined,
    ]);
  }
  revalidatePath('/', 'layout');
  return flashRedirect('success', `"${pname}" тоглогчийг нэмлээ.`, back);
}

export async function rosterAddNew(fd: FormData) {
  const user = await requireRole(['admin', 'commissioner']);
  const stid = int(fd, 'season_team_id');
  const back = `/admin/season-teams/${stid}`;
  const last = str(fd, 'last_name');
  const first = str(fd, 'first_name');
  if (!stid || !last || !first) return flashRedirect('danger', 'Овог, нэр заавал шаардлагатай.', back);
  if (!(await canSeasonTeam(user, stid))) return flashRedirect('danger', 'Эрхгүй.', back);
  const st = await stInfo(stid);
  if (!st) return flashRedirect('danger', 'Баг олдсонгүй.', '/admin/seasons');

  const birth = str(fd, 'birth_date');
  const joined = isDate(str(fd, 'joined_at')) ? str(fd, 'joined_at') : todayUB();
  await transaction(async (tx) => {
    const r = await tx.execute('INSERT INTO players (last_name, first_name, gender, birth_date, height_cm, created_by_user_id) VALUES (?,?,?,?,?,?)', [
      last, first, oneOf(str(fd, 'gender'), GENDERS, 'M'), isDate(birth) ? birth : null, intOrNull(fd, 'height_cm'), user.id,
    ]);
    await tx.execute("INSERT INTO team_season_roster (season_team_id, team_id, player_id, jersey_no, position, is_captain, status, joined_at) VALUES (?,?,?,?,?,?,'active',?)", [
      stid, st.team_id, r.insertId, str(fd, 'jersey_no') || null, str(fd, 'position') || null, fd.get('is_captain') ? 1 : 0, joined,
    ]);
  });
  revalidatePath('/', 'layout');
  return flashRedirect('success', `"${last} ${first}" шинээр үүсгэгдэж багт нэмэгдлээ.`, back);
}

export async function rosterEdit(fd: FormData) {
  const user = await requireRole(['admin', 'commissioner']);
  const stid = int(fd, 'season_team_id');
  const back = `/admin/season-teams/${stid}`;
  const rosterId = int(fd, 'roster_id');
  const playerId = int(fd, 'player_id');
  const last = str(fd, 'last_name');
  const first = str(fd, 'first_name');
  if (!rosterId || !playerId) return flashRedirect('danger', 'ID байхгүй.', back);
  if (!last || !first) return flashRedirect('danger', 'Овог, нэр заавал шаардлагатай.', back);
  if (!(await canSeasonTeam(user, stid))) return flashRedirect('danger', 'Эрхгүй.', back);
  const owns = await scalar('SELECT id FROM team_season_roster WHERE id=? AND season_team_id=? AND player_id=?', [rosterId, stid, playerId]);
  if (!owns) return flashRedirect('danger', 'Бүртгэл олдсонгүй.', back);

  let photo: string | null;
  try {
    photo = await saveImage(fd.get('photo'), 'players', 'player');
  } catch (e) {
    if (e instanceof UploadError) return flashRedirect('danger', e.message, back);
    throw e;
  }
  const old = photo ? await scalar<string>('SELECT photo_path FROM players WHERE id=?', [playerId]) : null;
  const birth = str(fd, 'birth_date');
  const status = oneOf(str(fd, 'status'), ['active', 'inactive', 'injured'] as const, 'active');

  await transaction(async (tx) => {
    await tx.execute(
      `UPDATE players SET last_name=?, first_name=?, gender=?, birth_date=?, height_cm=?, weight_kg=?, phone=?, updated_by_user_id=?${photo ? ', photo_path=?' : ''} WHERE id=?`,
      [
        last, first, oneOf(str(fd, 'gender'), GENDERS, 'M'), isDate(birth) ? birth : null, intOrNull(fd, 'height_cm'), intOrNull(fd, 'weight_kg'),
        str(fd, 'phone'), user.id, ...(photo ? [photo] : []), playerId,
      ],
    );
    await tx.execute('UPDATE team_season_roster SET jersey_no=?, position=?, is_captain=?, status=?, updated_at=app_now() WHERE id=?', [
      str(fd, 'jersey_no') || null, str(fd, 'position') || null, fd.get('is_captain') ? 1 : 0, status, rosterId,
    ]);
  });
  if (photo) await deleteUpload(old);
  revalidatePath('/', 'layout');
  return flashRedirect('success', 'Мэдээлэл амжилттай заслаа.', back);
}

/** Багаас гаргах — устгахгүй, түүх хадгална (status=inactive, left_at) */
export async function rosterLeave(fd: FormData) {
  const user = await requireRole(['admin', 'commissioner']);
  const stid = int(fd, 'season_team_id');
  const back = `/admin/season-teams/${stid}`;
  const rosterId = int(fd, 'roster_id');
  if (!(await canSeasonTeam(user, stid))) return flashRedirect('danger', 'Эрхгүй.', back);
  const r = await queryOne<{ status: string; name: string }>(
    "SELECT tsr.status, CONCAT(p.last_name,' ',p.first_name) AS name FROM team_season_roster tsr JOIN players p ON p.id=tsr.player_id WHERE tsr.id=? AND tsr.season_team_id=?",
    [rosterId, stid],
  );
  if (!r) return flashRedirect('danger', 'Бүртгэл олдсонгүй.', back);
  if (r.status !== 'active') return flashRedirect('danger', 'Тоглогч аль хэдийн гарсан байна.', back);
  await execute("UPDATE team_season_roster SET status='inactive', left_at=app_now()::date, updated_at=app_now() WHERE id=?", [rosterId]);
  revalidatePath('/', 'layout');
  return flashRedirect('success', `"${r.name}" багаас гарлаа.`, back);
}

/** Буцааж идэвхжүүлэх */
export async function rosterRejoin(fd: FormData) {
  const user = await requireRole(['admin', 'commissioner']);
  const stid = int(fd, 'season_team_id');
  const back = `/admin/season-teams/${stid}`;
  const rosterId = int(fd, 'roster_id');
  if (!(await canSeasonTeam(user, stid))) return flashRedirect('danger', 'Эрхгүй.', back);
  const r = await queryOne<{ player_id: number; season_id: number }>(
    'SELECT tsr.player_id, st.season_id FROM team_season_roster tsr JOIN season_teams st ON st.id=tsr.season_team_id WHERE tsr.id=? AND tsr.season_team_id=?',
    [rosterId, stid],
  );
  if (!r) return flashRedirect('danger', 'Бүртгэл олдсонгүй.', back);
  const other = await conflictTeam(r.season_id, r.player_id, stid);
  if (other) return flashRedirect('danger', `Тоглогч энэ улиралд "${other}" багт идэвхтэй байна.`, back);
  await execute("UPDATE team_season_roster SET status='active', left_at=NULL, updated_at=app_now() WHERE id=?", [rosterId]);
  revalidatePath('/', 'layout');
  return flashRedirect('success', 'Тоглогч дахин идэвхжлээ.', back);
}
