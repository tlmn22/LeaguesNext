import 'server-only';
import { query } from './db';
import { fmtDate, upper3 } from './format';
import type { UpcomingData } from '@/components/public/lmn';

type Row = { id: number; match_datetime: string; lg_name: string; ht: string; hsn: string | null; at: string; asn: string | null };

/** Өнөөдрөөс хойш товлогдсон / шууд явагдаж буй тоглолтууд */
export async function upcomingGames(limit: number): Promise<UpcomingData[]> {
  const rows = await query<Row>(
    `SELECT m.id, m.match_datetime, l.name AS lg_name, ht.name AS ht, ht.short_name AS hsn, at2.name AS at, at2.short_name AS asn
     FROM matches m
     JOIN seasons s ON s.id = m.season_id
     JOIN leagues l ON l.id = s.league_id
     JOIN season_teams hst ON hst.id = m.home_season_team_id
     JOIN season_teams ast ON ast.id = m.away_season_team_id
     JOIN teams ht ON ht.id = hst.team_id
     JOIN teams at2 ON at2.id = ast.team_id
     WHERE m.status IN ('scheduled','live') AND m.match_datetime >= app_now()::date
     ORDER BY m.match_datetime ASC
     LIMIT ?`,
    [limit],
  );
  return rows.map((m) => ({
    href: `/match/${m.id}`,
    day: fmtDate(m.match_datetime, 'm.d'),
    time: fmtDate(m.match_datetime, 'H:i'),
    home: upper3(m.hsn || m.ht),
    away: upper3(m.asn || m.at),
    homeName: m.ht,
    awayName: m.at,
    league: m.lg_name,
  }));
}
