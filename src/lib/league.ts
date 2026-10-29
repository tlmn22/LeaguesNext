import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { query, queryOne } from './db';
import { accentOf } from './format';

export type League = {
  id: number; tier: number; name: string; slug: string; description: string | null; logo: string | null;
  location: string | null; primary_color: string | null;
};
export type Season = { id: number; league_id: number; name: string; start_date: string | null; end_date: string | null; status: 'registration' | 'active' | 'finished' };

export type LeagueCtx = {
  lg: League;
  seasons: Season[];
  sid: number;
  season: Season | null;
  ac: string;
  slug: string;
};

export const getLeague = cache(async (slugOrId: string) => {
  const s = decodeURIComponent(slugOrId);
  const id = /^\d+$/.test(s) ? parseInt(s, 10) : 0;
  return queryOne<League>(
    'SELECT id, tier, name, slug, description, logo, location, primary_color FROM leagues WHERE LOWER(slug)=LOWER(?) OR id=? ORDER BY LOWER(slug)=LOWER(?) DESC LIMIT 1',
    [s, id, s],
  );
});

export const getLeagueCtx = cache(async (slugParam: string, sParam?: string): Promise<LeagueCtx> => {
  const lg = await getLeague(slugParam);
  if (!lg) notFound();
  const seasons = await query<Season>(
    'SELECT id, league_id, name, start_date, end_date, status FROM seasons WHERE league_id=? ORDER BY created_at DESC',
    [lg.id],
  );
  let sid = parseInt(sParam ?? '', 10) || 0;
  let season = seasons.find((x) => x.id === sid) ?? null;
  if (!season && seasons.length) {
    season = seasons[0];
    sid = season.id;
  }
  return { lg, seasons, sid, season, ac: accentOf(lg.primary_color), slug: lg.slug || String(lg.id) };
});

export const LEAGUE_TABS = [
  { key: 'home', icon: 'home', label: 'Тойм' },
  { key: 'matches', icon: 'sports_basketball', label: 'Хуваарь' },
  { key: 'standings', icon: 'format_list_numbered', label: 'Хүснэгт' },
  { key: 'stats', icon: 'bar_chart', label: 'Статистик' },
  { key: 'teams', icon: 'groups', label: 'Багууд' },
  { key: 'players', icon: 'person', label: 'Тоглогчид' },
  { key: 'news', icon: 'newspaper', label: 'Мэдээ' },
] as const;

export type LeagueTab = (typeof LEAGUE_TABS)[number]['key'];

/** Улирлын нэрнээс хүйс таних — "/Эмэгтэй/", "(эрэгтэй)" гэх мэт */
export function seasonGender(name: string): 'M' | 'F' | null {
  if (/эмэгтэй|women|female/i.test(name)) return 'F';
  if (/эрэгтэй|\bmen\b|\bmale\b/i.test(name)) return 'M';
  return null;
}

/** Хүйсний тэмдэглэгээг хассан улирлын нэр */
export const seasonLabel = (name: string) => name.replace(/[\s/(]*(эмэгтэй|эрэгтэй)[\s/)]*/gi, ' ').trim();

export const lgPath = (slug: string, sid: number, page: string = 'home', extra = '') =>
  `/league/${encodeURIComponent(slug)}${page === 'home' ? '' : '/' + page}?s=${sid}${extra}`;

export type StandingRow = {
  stid: number; name: string; logo_path: string | null; zone: string | null;
  gp: number; wins: number; losses: number; pf: number; pa: number;
};

/** Улирлын хүснэгт — zone-оор бүлэглэнэ */
export async function getStandings(sid: number) {
  const rows = await query<StandingRow>(
    `SELECT st.id AS stid, t.name, t.logo_path, st.zone,
       SUM(CASE WHEN m.status='finished' THEN 1 ELSE 0 END) AS gp,
       SUM(CASE WHEN m.status='finished' AND (
         (m.home_season_team_id=st.id AND m.home_score>m.away_score) OR
         (m.away_season_team_id=st.id AND m.away_score>m.home_score)) THEN 1 ELSE 0 END) AS wins,
       SUM(CASE WHEN m.status='finished' AND (
         (m.home_season_team_id=st.id AND m.home_score<m.away_score) OR
         (m.away_season_team_id=st.id AND m.away_score<m.home_score)) THEN 1 ELSE 0 END) AS losses,
       SUM(CASE WHEN m.status='finished' AND m.home_season_team_id=st.id THEN m.home_score
                WHEN m.status='finished' AND m.away_season_team_id=st.id THEN m.away_score ELSE 0 END) AS pf,
       SUM(CASE WHEN m.status='finished' AND m.home_season_team_id=st.id THEN m.away_score
                WHEN m.status='finished' AND m.away_season_team_id=st.id THEN m.home_score ELSE 0 END) AS pa
     FROM season_teams st JOIN teams t ON t.id=st.team_id
     LEFT JOIN matches m ON m.season_id=st.season_id
       AND (m.home_season_team_id=st.id OR m.away_season_team_id=st.id)
     WHERE st.season_id=?
     GROUP BY st.id, t.name, t.logo_path, st.zone
     ORDER BY st.zone`,
    [sid],
  );
  // Эрэмбэ: бүс → ялалт ↓ → онооны зөрүү ↓ → авсан оноо ↓
  const norm = rows
    .map((r) => ({ ...r, gp: Number(r.gp), wins: Number(r.wins), losses: Number(r.losses), pf: Number(r.pf), pa: Number(r.pa) }))
    .sort((a, b) => (a.zone || '').localeCompare(b.zone || '') || b.wins - a.wins || b.pf - b.pa - (a.pf - a.pa) || b.pf - a.pf);
  const zones = new Map<string, StandingRow[]>();
  for (const r of norm) {
    const z = r.zone || '';
    if (!zones.has(z)) zones.set(z, []);
    zones.get(z)!.push(r);
  }
  const hasZones = zones.size > 1 || (zones.size === 1 && !zones.has(''));
  return { zones, hasZones };
}

export type MatchRow = {
  id: number; match_datetime: string; status: string; home_score: number; away_score: number;
  ht: string; hl: string | null; at: string; al: string | null;
};

export const MATCH_ROW_SQL = `
  SELECT m.id, m.match_datetime, m.status, m.home_score, m.away_score,
         ht.name AS ht, ht.logo_path AS hl, at2.name AS at, at2.logo_path AS al
  FROM matches m
  JOIN season_teams hst ON hst.id=m.home_season_team_id
  JOIN season_teams ast ON ast.id=m.away_season_team_id
  JOIN teams ht ON ht.id=hst.team_id
  JOIN teams at2 ON at2.id=ast.team_id`;

export type LeaderRow = {
  pid: number; first_name: string; last_name: string; photo_path: string | null; team_name: string; team_logo: string | null; team_color: string | null;
  position: string | null; jersey_no: string | null; gp: number; val: number; total: number;
};

export const STAT_COLS = {
  pts: ['PPG', 'mps.points', 'Оноо'],
  reb: ['RPG', 'mps.reb_total', 'Rebounds'],
  ast: ['APG', 'mps.assists', 'Assists'],
  stl: ['SPG', 'mps.steals', 'Steals'],
  blk: ['BPG', 'mps.blocks', 'Blocks'],
} as const;
export type StatKey = keyof typeof STAT_COLS;

/** Улирлын тэргүүлэгчид (дундажаар) */
export async function getLeaders(sid: number, key: StatKey, limit: number) {
  const col = STAT_COLS[key][1]; // whitelist-ээс — SQL injection боломжгүй
  return query<LeaderRow>(
    `SELECT p.id AS pid, p.first_name, p.last_name, p.photo_path,
            MAX(t.name) AS team_name, MAX(t.logo_path) AS team_logo, MAX(t.primary_color) AS team_color,
            (SELECT MAX(tsr.position) FROM team_season_roster tsr JOIN season_teams st ON st.id=tsr.season_team_id
              WHERE tsr.player_id=p.id AND st.season_id=?) AS position,
            (SELECT MAX(tsr.jersey_no) FROM team_season_roster tsr JOIN season_teams st ON st.id=tsr.season_team_id
              WHERE tsr.player_id=p.id AND st.season_id=?) AS jersey_no,
            COUNT(DISTINCT mps.match_id) AS gp,
            ROUND(SUM(${col})::numeric/NULLIF(COUNT(DISTINCT mps.match_id),0),1) AS val,
            SUM(${col}) AS total
     FROM match_player_stats mps
     JOIN players p ON p.id=mps.player_id
     JOIN matches m ON m.id=mps.match_id
     JOIN teams t ON t.id=mps.team_id
     WHERE m.season_id=? AND (mps.minutes > 0 OR mps.seconds > 0)
     GROUP BY p.id, p.first_name, p.last_name, p.photo_path
     HAVING COUNT(DISTINCT mps.match_id)>=1
     ORDER BY val DESC, total DESC
     LIMIT ?`,
    [sid, sid, sid, limit],
  );
}

export const teamPath = (slug: string, sid: number, stid: number) => `/league/${encodeURIComponent(slug)}/teams/${stid}?s=${sid}`;
