import 'server-only';
import { query, queryOne, transaction } from './db';
import { PERIODS, PLAYER_FIELDS, TEAM_STAT_FIELDS, type RosterPlayer, type ScorePayload } from './score-types';

const clampInt = (v: unknown, min = 0, max = 999) => {
  const n = Math.trunc(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.max(min, Math.min(max, n));
};

export type MatchHead = {
  id: number; season_id: number; status: string; home_score: number; away_score: number; match_datetime: string;
  home_season_team_id: number; away_season_team_id: number;
  season_name: string; league_name: string; league_id: number;
  home_team: string; home_team_id: number; home_logo: string | null; away_team: string; away_team_id: number; away_logo: string | null;
};

export async function getMatchHead(id: number) {
  return queryOne<MatchHead>(
    `SELECT m.id, m.season_id, m.status, m.home_score, m.away_score, m.match_datetime, m.home_season_team_id, m.away_season_team_id,
            s.name AS season_name, l.name AS league_name, l.id AS league_id,
            ht.name AS home_team, ht.id AS home_team_id, ht.logo_path AS home_logo,
            at2.name AS away_team, at2.id AS away_team_id, at2.logo_path AS away_logo
     FROM matches m
     JOIN seasons s ON s.id=m.season_id
     JOIN leagues l ON l.id=s.league_id
     JOIN season_teams hst ON hst.id=m.home_season_team_id
     JOIN season_teams ast ON ast.id=m.away_season_team_id
     JOIN teams ht ON ht.id=hst.team_id
     JOIN teams at2 ON at2.id=ast.team_id
     WHERE m.id=?`,
    [id],
  );
}

/** Editor-т хэрэгтэй бүх өгөгдөл */
export async function loadScoreData(m: MatchHead) {
  const rosterSql = `
    SELECT tsr.player_id, tsr.season_team_id, tsr.jersey_no, tsr.position, p.last_name, p.first_name, p.photo_path
    FROM team_season_roster tsr JOIN players p ON p.id=tsr.player_id
    WHERE tsr.season_team_id=? AND (tsr.status IN ('active','injured') OR tsr.player_id IN (SELECT player_id FROM match_player_stats WHERE match_id=?))
    ORDER BY (tsr.jersey_no IS NULL OR tsr.jersey_no=''), CASE WHEN tsr.jersey_no ~ '^[0-9]+$' THEN tsr.jersey_no::integer ELSE 0 END, p.last_name`;
  const [periods, teamStats, home, away, stats] = await Promise.all([
    query<{ period: string; home_score: number; away_score: number }>('SELECT period, home_score, away_score FROM match_status WHERE match_id=?', [m.id]),
    query<Record<string, number> & { side: 'home' | 'away' }>('SELECT * FROM match_team_stats WHERE match_id=?', [m.id]),
    query<RosterPlayer>(rosterSql, [m.home_season_team_id, m.id]),
    query<RosterPlayer>(rosterSql, [m.away_season_team_id, m.id]),
    query<Record<string, number | null> & { player_id: number }>('SELECT * FROM match_player_stats WHERE match_id=?', [m.id]),
  ]);
  return {
    periods: Object.fromEntries(periods.map((p) => [p.period, { home: p.home_score, away: p.away_score }])),
    teamStats: Object.fromEntries(teamStats.map((t) => [t.side, Object.fromEntries(TEAM_STAT_FIELDS.map(([f]) => [f, t[f] ?? null]))])),
    home,
    away,
    stats: Object.fromEntries(stats.map((s) => [s.player_id, Object.fromEntries(PLAYER_FIELDS.map((f) => [f, s[f] ?? null]))])) as Record<number, Record<string, number | null>>,
  };
}

/**
 * Дүн, улирлын оноо, багийн статистик, тоглогчдын boxscore-ийг нэг transaction-оор хадгална.
 * Тоглогчид тухайн тоглолтын хоёр багийн roster-т байх ёстой (өөр тоглогч оруулахаас сэргийлнэ).
 */
export async function persistScore(m: MatchHead, p: ScorePayload, userId: number) {
  const allowedTeam = new Map<number, number>([
    [m.home_season_team_id, m.home_team_id],
    [m.away_season_team_id, m.away_team_id],
  ]);
  const roster = await query<{ player_id: number; season_team_id: number }>(
    'SELECT player_id, season_team_id FROM team_season_roster WHERE season_team_id IN (?,?)',
    [m.home_season_team_id, m.away_season_team_id],
  );
  const playerTeam = new Map<number, number>();
  for (const r of roster) playerTeam.set(r.player_id, allowedTeam.get(r.season_team_id)!);
  // Өмнө нь stat-тай боловч roster-оос гарсан тоглогчийн багийг хадгална
  const existing = await query<{ player_id: number; team_id: number }>('SELECT player_id, team_id FROM match_player_stats WHERE match_id=?', [m.id]);
  for (const e of existing) if (!playerTeam.has(e.player_id)) playerTeam.set(e.player_id, e.team_id);

  const status = (['scheduled', 'live', 'finished', 'cancelled'] as const).includes(p.status) ? p.status : (m.status as ScorePayload['status']);

  await transaction(async (tx) => {
    await tx.execute('UPDATE matches SET home_score=?, away_score=?, status=? WHERE id=?', [clampInt(p.home_score), clampInt(p.away_score), status, m.id]);

    for (const per of PERIODS) {
      const v = p.periods?.[per];
      const h = v?.home ?? null;
      const a = v?.away ?? null;
      if (h === null && a === null) {
        await tx.execute('DELETE FROM match_status WHERE match_id=? AND period=?', [m.id, per]);
      } else {
        await tx.execute(
          'INSERT INTO match_status (match_id, period, home_score, away_score) VALUES (?,?,?,?) ON CONFLICT (match_id, period) DO UPDATE SET home_score=EXCLUDED.home_score, away_score=EXCLUDED.away_score',
          [m.id, per, clampInt(h), clampInt(a)],
        );
      }
    }

    for (const side of ['home', 'away'] as const) {
      const ts = p.teamStats?.[side];
      if (!ts) continue;
      const vals = TEAM_STAT_FIELDS.map(([f]) => clampInt(ts[f]));
      await tx.execute(
        `INSERT INTO match_team_stats (match_id, team_id, side, ${TEAM_STAT_FIELDS.map(([f]) => f).join(', ')}) VALUES (?,?,?,?,?,?,?,?)
         ON CONFLICT (match_id, side) DO UPDATE SET team_id=EXCLUDED.team_id, ${TEAM_STAT_FIELDS.map(([f]) => `${f}=EXCLUDED.${f}`).join(', ')}`,
        [m.id, side === 'home' ? m.home_team_id : m.away_team_id, side, ...vals],
      );
    }

    for (const line of p.players ?? []) {
      const pid = Math.trunc(Number(line.player_id));
      const teamId = playerTeam.get(pid);
      if (!pid || !teamId) continue;
      const g = (f: (typeof PLAYER_FIELDS)[number], max = 999) => (line.dnp ? 0 : clampInt(line[f], 0, max));
      const t2m = g('two_made'), t2a = Math.max(g('two_attempts'), t2m);
      const t3m = g('three_made'), t3a = Math.max(g('three_attempts'), t3m);
      const ftm = g('ft_made'), fta = Math.max(g('ft_attempts'), ftm);
      const or = g('reb_off'), dr = g('reb_def');
      const pm = line.dnp ? 0 : clampInt(line.plus_minus, -200, 200);
      const row = [
        teamId, g('minutes', 70), g('seconds', 59), t2m * 2 + t3m * 3 + ftm,
        t2m + t3m, t2a + t3a, t2m, t2a, t3m, t3a, ftm, fta, or, dr, or + dr,
        g('assists'), g('turnovers'), g('steals'), g('blocks'), g('fouls_committed', 10), pm, userId,
      ];
      const eid = await tx.scalar<number>('SELECT id FROM match_player_stats WHERE match_id=? AND player_id=? LIMIT 1', [m.id, pid]);
      if (eid) {
        await tx.execute(
          `UPDATE match_player_stats SET team_id=?, minutes=?, seconds=?, points=?, fg_made=?, fg_attempts=?, two_made=?, two_attempts=?,
             three_made=?, three_attempts=?, ft_made=?, ft_attempts=?, reb_off=?, reb_def=?, reb_total=?, assists=?, turnovers=?,
             steals=?, blocks=?, fouls_committed=?, plus_minus=?, entered_by=?, updated_at=app_now() WHERE id=?`,
          [...row, eid],
        );
      } else {
        await tx.execute(
          `INSERT INTO match_player_stats (team_id, minutes, seconds, points, fg_made, fg_attempts, two_made, two_attempts,
             three_made, three_attempts, ft_made, ft_attempts, reb_off, reb_def, reb_total, assists, turnovers,
             steals, blocks, fouls_committed, plus_minus, entered_by, match_id, player_id)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [...row, m.id, pid],
        );
      }
    }
  });
}
