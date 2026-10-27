'use server';

import { revalidatePath } from 'next/cache';
import { canManageLeague, requireRole } from '@/lib/auth';
import { execute, queryOne, scalar } from '@/lib/db';
import { flashRedirect } from '@/lib/flash';
import { int, intOrNull, isDate, oneOf, str } from '@/lib/form';
import { canSeason, canSeasonTeam } from '@/lib/scope';

const STATUSES = ['registration', 'active', 'finished'] as const;

export async function saveSeason(fd: FormData) {
  const user = await requireRole(['admin', 'commissioner']);
  const id = intOrNull(fd, 'id');
  const back = id ? `/admin/seasons/${id}/edit` : '/admin/seasons/new';
  const leagueId = user.role === 'commissioner' ? Number(user.league_id ?? 0) : int(fd, 'league_id');
  const name = str(fd, 'name');
  const description = str(fd, 'description');
  const start = str(fd, 'start_date');
  const end = str(fd, 'end_date');
  const status = oneOf(str(fd, 'status'), STATUSES, 'active');

  if (!name || !leagueId) return flashRedirect('danger', 'Лиг болон улирлын нэр заавал шаардлагатай.', back);
  if (!canManageLeague(user, leagueId)) return flashRedirect('danger', 'Та энэ лигт улирал нэмэх эрхгүй.', '/admin/seasons');

  if (id) {
    if (!(await canSeason(user, id))) return flashRedirect('danger', 'Эрхгүй.', '/admin/seasons');
    await execute('UPDATE seasons SET league_id=?, name=?, description=?, start_date=?, end_date=?, status=? WHERE id=?', [
      leagueId, name, description, isDate(start) ? start : null, isDate(end) ? end : null, status, id,
    ]);
  } else {
    await execute('INSERT INTO seasons (league_id, created_id, name, description, start_date, end_date, status) VALUES (?,?,?,?,?,?,?)', [
      leagueId, String(user.id), name, description, isDate(start) ? start : null, isDate(end) ? end : null, status,
    ]);
  }
  revalidatePath('/', 'layout');
  return flashRedirect('success', id ? `"${name}" улирлыг амжилттай заслаа.` : `"${name}" улирал амжилттай нэмэгдлээ.`, '/admin/seasons');
}

export async function deleteSeason(fd: FormData) {
  const user = await requireRole(['admin', 'commissioner']);
  const id = int(fd, 'id');
  const s = await queryOne<{ name: string; league_id: number }>('SELECT name, league_id FROM seasons WHERE id=?', [id]);
  if (!s) return flashRedirect('danger', 'Улирал олдсонгүй.', '/admin/seasons');
  if (!canManageLeague(user, s.league_id)) return flashRedirect('danger', 'Та энэ улирлыг устгах эрхгүй.', '/admin/seasons');
  if (Number(await scalar('SELECT COUNT(*) FROM matches WHERE season_id=?', [id])) > 0)
    return flashRedirect('danger', `"${s.name}" улиралд тоглолтууд байна. Эхлээд тоглолтуудыг устгана уу.`, '/admin/seasons');
  if (Number(await scalar('SELECT COUNT(*) FROM season_teams WHERE season_id=?', [id])) > 0)
    return flashRedirect('danger', `"${s.name}" улиралд баг бүртгэлтэй байна. Эхлээд багуудыг хасна уу.`, '/admin/seasons');
  await execute('DELETE FROM seasons WHERE id=?', [id]);
  revalidatePath('/', 'layout');
  return flashRedirect('success', `"${s.name}" улирал устгагдлаа.`, '/admin/seasons');
}

// ── Улирлын багууд ─────────────────────────────────────────────

export async function addSeasonTeam(fd: FormData) {
  const user = await requireRole(['admin', 'commissioner']);
  const seasonId = int(fd, 'season_id');
  const teamId = int(fd, 'team_id');
  const back = `/admin/seasons/${seasonId}?tab=teams`;
  if (!seasonId || !teamId) return flashRedirect('danger', 'Улирал болон баг сонгоно уу.', back);
  if (!(await canSeason(user, seasonId))) return flashRedirect('danger', 'Та энэ улиралд баг нэмэх эрхгүй.', back);
  if (await scalar('SELECT id FROM season_teams WHERE season_id=? AND team_id=?', [seasonId, teamId]))
    return flashRedirect('danger', 'Энэ баг аль хэдийн бүртгэлтэй байна.', back);
  await execute('INSERT INTO season_teams (season_id, team_id, zone, seed) VALUES (?,?,?,?)', [seasonId, teamId, str(fd, 'zone') || null, intOrNull(fd, 'seed')]);
  const name = await scalar<string>('SELECT name FROM teams WHERE id=?', [teamId]);
  revalidatePath('/', 'layout');
  return flashRedirect('success', `"${name}" баг улиралд нэмэгдлээ.`, back);
}

export async function removeSeasonTeam(fd: FormData) {
  const user = await requireRole(['admin', 'commissioner']);
  const stid = int(fd, 'season_team_id');
  const seasonId = int(fd, 'season_id');
  const back = `/admin/seasons/${seasonId}?tab=teams`;
  if (!(await canSeasonTeam(user, stid))) return flashRedirect('danger', 'Эрхгүй.', back);
  const matches = Number(await scalar('SELECT COUNT(*) FROM matches WHERE home_season_team_id=? OR away_season_team_id=?', [stid, stid]));
  if (matches > 0) return flashRedirect('danger', `Энэ баг ${matches} тоглолтод оролцсон тул хасах боломжгүй.`, back);
  await execute('DELETE FROM team_season_roster WHERE season_team_id=?', [stid]);
  await execute('DELETE FROM season_teams WHERE id=?', [stid]);
  revalidatePath('/', 'layout');
  return flashRedirect('success', 'Баг улирлаас хасагдлаа.', back);
}

export async function updateZone(fd: FormData) {
  const user = await requireRole(['admin', 'commissioner']);
  const stid = int(fd, 'season_team_id');
  const seasonId = int(fd, 'season_id');
  const back = `/admin/seasons/${seasonId}?tab=teams`;
  if (!(await canSeasonTeam(user, stid))) return flashRedirect('danger', 'Эрхгүй.', back);
  await execute('UPDATE season_teams SET zone=?, seed=? WHERE id=?', [str(fd, 'zone') || null, intOrNull(fd, 'seed'), stid]);
  revalidatePath('/', 'layout');
  return flashRedirect('success', 'Бүлэг/seed шинэчлэгдлээ.', back);
}
