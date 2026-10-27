'use server';

import { revalidatePath } from 'next/cache';
import { canManageLeague, requireRole, type User } from '@/lib/auth';
import { execute, query, queryOne, scalar } from '@/lib/db';
import { flashRedirect } from '@/lib/flash';
import { int, intOrNull, oneOf, str } from '@/lib/form';
import { canMatch, canSeason } from '@/lib/scope';
import { getMatchHead, persistScore, type MatchHead } from '@/lib/score';
import type { RosterPlayer, SaveResult, ScorePayload } from '@/lib/score-types';

const STAGES = ['regular', 'playoff', 'allstar', 'custom'] as const;
const STATUSES = ['scheduled', 'live', 'finished', 'cancelled'] as const;

export async function saveMatch(fd: FormData) {
  const user = await requireRole(['admin', 'commissioner']);
  const id = intOrNull(fd, 'id');
  const back = id ? `/admin/matches/${id}` : '/admin/matches/new';
  const seasonId = int(fd, 'season_id');
  const home = int(fd, 'home_season_team_id');
  const away = int(fd, 'away_season_team_id');
  const dtRaw = str(fd, 'match_datetime');
  const dt = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dtRaw) ? dtRaw.replace('T', ' ').slice(0, 16) + ':00' : '';

  if (!seasonId || !home || !away || !dt) return flashRedirect('danger', 'Заавал талбарууд дутуу байна.', back + (seasonId ? `?season_id=${seasonId}` : ''));
  if (home === away) return flashRedirect('danger', 'Гэрийн болон зочин баг ижил байж болохгүй.', back);
  if (!(await canSeason(user, seasonId))) return flashRedirect('danger', 'Эрхгүй.', '/admin/matches');
  if (id && !(await canMatch(user, id))) return flashRedirect('danger', 'Эрхгүй.', '/admin/matches');
  // Хоёр баг энэ улиралд бүртгэлтэй эсэх
  const ok = Number(await scalar('SELECT COUNT(*) FROM season_teams WHERE season_id=? AND id IN (?,?)', [seasonId, home, away]));
  if (ok !== 2) return flashRedirect('danger', 'Сонгосон багууд энэ улиралд бүртгэлгүй байна.', back);

  const vals = [
    seasonId, home, away, dt,
    oneOf(str(fd, 'stage'), STAGES, 'regular'),
    intOrNull(fd, 'game_no'),
    str(fd, 'arena_name') || null,
    str(fd, 'live_embed_code') || null,
    oneOf(str(fd, 'status'), STATUSES, 'scheduled'),
  ];

  if (id) {
    // Stat-тай тоглолтын багийг солихыг хориглоно
    const cur = await queryOne<{ home_season_team_id: number; away_season_team_id: number }>('SELECT home_season_team_id, away_season_team_id FROM matches WHERE id=?', [id]);
    const hasStats = Number(await scalar('SELECT COUNT(*) FROM match_player_stats WHERE match_id=?', [id])) > 0;
    if (cur && hasStats && (cur.home_season_team_id !== home || cur.away_season_team_id !== away))
      return flashRedirect('danger', 'Статистик орсон тоглолтын багуудыг солих боломжгүй.', back);
    await execute(
      'UPDATE matches SET season_id=?, home_season_team_id=?, away_season_team_id=?, match_datetime=?, stage=?, game_no=?, arena_name=?, live_embed_code=?, status=? WHERE id=?',
      [...vals, id],
    );
    revalidatePath('/', 'layout');
    return flashRedirect('success', 'Тоглолт амжилттай заслаа.', `/admin/matches?season_id=${seasonId}`);
  }

  const r = await execute(
    'INSERT INTO matches (season_id, home_season_team_id, away_season_team_id, match_datetime, stage, game_no, arena_name, live_embed_code, status, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [...vals, user.id],
  );
  revalidatePath('/', 'layout');
  return flashRedirect('success', 'Тоглолт амжилттай нэмэгдлээ.', `/admin/matches?season_id=${seasonId}`);
}

export async function deleteMatch(fd: FormData) {
  const user = await requireRole(['admin', 'commissioner']);
  const id = int(fd, 'id');
  const backRaw = str(fd, 'back');
  const back = backRaw.startsWith('/admin') ? backRaw : '/admin/matches';
  const m = await queryOne<{ home: string; away: string; league_id: number }>(
    `SELECT ht.name AS home, at2.name AS away, s.league_id FROM matches m JOIN seasons s ON s.id=m.season_id
     JOIN season_teams hst ON hst.id=m.home_season_team_id JOIN season_teams ast ON ast.id=m.away_season_team_id
     JOIN teams ht ON ht.id=hst.team_id JOIN teams at2 ON at2.id=ast.team_id WHERE m.id=?`,
    [id],
  );
  if (!m) return flashRedirect('danger', 'Тоглолт олдсонгүй.', back);
  if (!canManageLeague(user, m.league_id)) return flashRedirect('danger', 'Эрхгүй.', back);
  if (Number(await scalar('SELECT COUNT(*) FROM match_player_stats WHERE match_id=?', [id])) > 0)
    return flashRedirect('danger', 'Тоглолтод статистик мэдээлэл байна. Устгах боломжгүй.', back);
  await execute('DELETE FROM match_status WHERE match_id=?', [id]);
  await execute('DELETE FROM match_team_stats WHERE match_id=?', [id]);
  await execute('DELETE FROM matches WHERE id=?', [id]);
  revalidatePath('/', 'layout');
  return flashRedirect('success', `"${m.home} vs ${m.away}" тоглолт устгагдлаа.`, back);
}

type Ctx = { user: User; m: MatchHead };

/** Admin бүх тоглолтыг, commissioner зөвхөн өөрийн лигийн тоглолтыг засна */
async function guard(matchId: number): Promise<Ctx | string> {
  const user = await requireRole(['admin', 'commissioner']);
  const m = await getMatchHead(Math.trunc(Number(matchId)));
  if (!m) return 'Тоглолт олдсонгүй.';
  if (!canManageLeague(user, m.league_id)) return 'Эрхгүй.';
  return { user, m };
}

/** Admin/commissioner — boxscore autosave */
export async function saveScoreAdmin(payload: ScorePayload): Promise<SaveResult> {
  const g = await guard(payload?.matchId);
  if (typeof g === 'string') return { ok: false, message: g };
  const { user, m } = g;
  try {
    await persistScore(m, payload, user.id);
  } catch (e) {
    console.error('[saveScoreAdmin]', e);
    return { ok: false, message: 'Хадгалахад алдаа гарлаа.' };
  }
  revalidatePath(`/match/${m.id}`);
  return { ok: true, message: 'Хадгалагдлаа', savedAt: new Date().toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ulaanbaatar' }) };
}

/** Тоглолтын аль нэг багийн season_team мөн эсэх */
const ownsTeam = (m: MatchHead, stid: number) => stid === m.home_season_team_id || stid === m.away_season_team_id;

export async function updateJersey(matchId: number, stid: number, playerId: number, jersey: string): Promise<SaveResult> {
  const g = await guard(matchId);
  if (typeof g === 'string') return { ok: false, message: g };
  if (!ownsTeam(g.m, stid)) return { ok: false, message: 'Буруу баг.' };
  const j = String(jersey ?? '').replace(/\D/g, '').slice(0, 3);
  await execute('UPDATE team_season_roster SET jersey_no=?, updated_at=app_now() WHERE season_team_id=? AND player_id=?', [j || null, stid, playerId]);
  return { ok: true, message: 'Хадгалагдлаа' };
}

export async function removeFromRoster(matchId: number, stid: number, playerId: number): Promise<SaveResult> {
  const g = await guard(matchId);
  if (typeof g === 'string') return { ok: false, message: g };
  if (!ownsTeam(g.m, stid)) return { ok: false, message: 'Буруу баг.' };
  // Энэ тоглолтод бүртгэгдсэн stat-ыг устгана (бусад тоглолтын түүх хэвээр)
  await execute('DELETE FROM match_player_stats WHERE match_id=? AND player_id=?', [g.m.id, playerId]);
  await execute("UPDATE team_season_roster SET status='inactive', left_at=app_now()::date, updated_at=app_now() WHERE season_team_id=? AND player_id=?", [stid, playerId]);
  return { ok: true, message: 'Хасагдлаа' };
}

export async function searchPlayers(q: string): Promise<{ id: number; last_name: string; first_name: string }[]> {
  await requireRole(['admin', 'commissioner']);
  const s = String(q ?? '').trim().slice(0, 60);
  if (s.length < 2) return [];
  const like = `%${s}%`;
  return query(
    "SELECT id, last_name, first_name FROM players WHERE CONCAT(last_name,' ',first_name) ILIKE ? OR CONCAT(first_name,' ',last_name) ILIKE ? ORDER BY last_name, first_name LIMIT 15",
    [like, like],
  );
}

export async function addToRoster(
  matchId: number,
  stid: number,
  d: { player_id?: number; last_name: string; first_name: string; jersey_no: string; position: string },
): Promise<SaveResult & { player?: RosterPlayer }> {
  const g = await guard(matchId);
  if (typeof g === 'string') return { ok: false, message: g };
  if (!ownsTeam(g.m, stid)) return { ok: false, message: 'Буруу баг.' };
  const last = String(d?.last_name ?? '').trim().slice(0, 80);
  const first = String(d?.first_name ?? '').trim().slice(0, 80);
  if (!last || !first) return { ok: false, message: 'Овог, нэр шаардлагатай.' };
  const jersey = String(d?.jersey_no ?? '').replace(/\D/g, '').slice(0, 3) || null;
  const pos = ['PG', 'SG', 'SF', 'PF', 'C'].includes(d?.position) ? d.position : null;
  const teamId = stid === g.m.home_season_team_id ? g.m.home_team_id : g.m.away_team_id;

  let pid = Math.trunc(Number(d?.player_id ?? 0));
  if (pid && !(await scalar('SELECT id FROM players WHERE id=?', [pid]))) pid = 0;
  if (!pid) pid = Number(await scalar('SELECT id FROM players WHERE last_name=? AND first_name=? LIMIT 1', [last, first])) || 0;

  if (pid) {
    const other = await scalar<string>(
      `SELECT t.name FROM team_season_roster tsr JOIN season_teams st2 ON st2.id=tsr.season_team_id JOIN teams t ON t.id=st2.team_id
       WHERE st2.season_id=? AND tsr.player_id=? AND tsr.status='active' AND st2.id<>? LIMIT 1`,
      [g.m.season_id, pid, stid],
    );
    if (other) return { ok: false, message: `Тоглогч энэ улиралд "${other}" багт идэвхтэй байна.` };
  } else {
    pid = (await execute('INSERT INTO players (last_name, first_name, created_by_user_id) VALUES (?,?,?)', [last, first, g.user.id])).insertId;
  }

  const rid = await scalar<number>('SELECT id FROM team_season_roster WHERE season_team_id=? AND player_id=?', [stid, pid]);
  if (rid) await execute("UPDATE team_season_roster SET status='active', left_at=NULL, jersey_no=COALESCE(?, jersey_no), position=COALESCE(?, position) WHERE id=?", [jersey, pos, rid]);
  else
    await execute("INSERT INTO team_season_roster (season_team_id, team_id, player_id, jersey_no, position, status, joined_at) VALUES (?,?,?,?,?,'active',app_now()::date)", [
      stid, teamId, pid, jersey, pos,
    ]);

  const p = await queryOne<RosterPlayer>(
    'SELECT tsr.player_id, tsr.season_team_id, tsr.jersey_no, tsr.position, p.last_name, p.first_name, p.photo_path FROM team_season_roster tsr JOIN players p ON p.id=tsr.player_id WHERE tsr.season_team_id=? AND tsr.player_id=?',
    [stid, pid],
  );
  return { ok: true, message: `${last} ${first} нэмэгдлээ.`, player: p ?? undefined };
}
