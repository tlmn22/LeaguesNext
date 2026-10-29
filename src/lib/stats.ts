import 'server-only';
import { query } from './db';
import { fileUrl, tc } from './format';
import { teamPath } from './league';

/** Datatable-ийн нэг мөр — v: баганын түлхүүр → утга (null бол "-") */
export type StatRow = { id: number; href: string; name: string; sub: string; photo: string | null; pos: string | null; v: Record<string, number | null> };

type Sums = {
  gp: number; secs: number; pts: number; fgm: number; fga: number; tpm: number; tpa: number; ftm: number; fta: number;
  oreb: number; dreb: number; reb: number; ast: number; stl: number; blk: number; tov: number; pf: number;
};

const SUMS = `
  COUNT(DISTINCT mps.match_id) AS gp,
  SUM(COALESCE(mps.minutes,0)*60 + COALESCE(mps.seconds,0)) AS secs,
  SUM(mps.points) AS pts,
  -- Хуучин (PHP) өгөгдөлд fg_made зөрүүтэй тул 2 ба 3 онооны шидэлтээс тооцно
  SUM(mps.two_made + mps.three_made) AS fgm, SUM(mps.two_attempts + mps.three_attempts) AS fga,
  SUM(mps.three_made) AS tpm, SUM(mps.three_attempts) AS tpa, SUM(mps.ft_made) AS ftm, SUM(mps.ft_attempts) AS fta,
  SUM(mps.reb_off) AS oreb, SUM(mps.reb_def) AS dreb, SUM(mps.reb_total) AS reb, SUM(mps.assists) AS ast,
  SUM(mps.steals) AS stl, SUM(mps.blocks) AS blk, SUM(mps.turnovers) AS tov, SUM(mps.fouls_committed) AS pf`;

const r1 = (x: number) => Math.round(x * 10) / 10;
const pct = (m: number, a: number) => (a > 0 ? Math.round((m / a) * 100) : null);

/** Нийлбэрээс тоглолт тутмын дундаж */
function perGame(s: Sums, minutes: boolean): Record<string, number | null> {
  const g = Number(s.gp);
  if (!g) return { gp: 0 };
  const pg = (k: keyof Sums) => r1(Number(s[k]) / g);
  return {
    gp: g,
    ...(minutes ? { min: r1(Number(s.secs) / 60 / g) } : {}),
    ppg: pg('pts'),
    fgm: pg('fgm'), fga: pg('fga'), fgp: pct(Number(s.fgm), Number(s.fga)),
    tpm: pg('tpm'), tpa: pg('tpa'), tpp: pct(Number(s.tpm), Number(s.tpa)),
    ftm: pg('ftm'), fta: pg('fta'), ftp: pct(Number(s.ftm), Number(s.fta)),
    orpg: pg('oreb'), drpg: pg('dreb'), rpg: pg('reb'),
    apg: pg('ast'), spg: pg('stl'), bpg: pg('blk'), tpg: pg('tov'), pfpg: pg('pf'),
  };
}

/** Улирлын бүх тоглогчийн дундаж статистик (зөвхөн тоглосон тоглолтууд — DNP тооцохгүй) */
export async function playerStats(sid: number): Promise<StatRow[]> {
  const rows = await query<Sums & { id: number; first_name: string; last_name: string; photo_path: string | null; team: string; pos: string | null }>(
    `SELECT p.id, p.first_name, p.last_name, p.photo_path, MAX(t.name) AS team,
            (SELECT MAX(tsr.position) FROM team_season_roster tsr JOIN season_teams st ON st.id=tsr.season_team_id
              WHERE tsr.player_id=p.id AND st.season_id=?) AS pos,
            ${SUMS}
     FROM match_player_stats mps
     JOIN matches m ON m.id=mps.match_id
     JOIN players p ON p.id=mps.player_id
     JOIN teams t ON t.id=mps.team_id
     WHERE m.season_id=? AND (mps.minutes > 0 OR mps.seconds > 0)
     GROUP BY p.id, p.first_name, p.last_name, p.photo_path`,
    [sid, sid],
  );
  return rows.map((r) => ({
    id: r.id,
    href: `/player/${r.id}?s=${sid}`,
    name: `${tc(r.last_name)} ${tc(r.first_name)}`,
    sub: tc(r.team),
    photo: r.photo_path ? fileUrl(r.photo_path) : null,
    pos: r.pos,
    v: perGame(r, true),
  }));
}

/** Улирлын багуудын дундаж статистик + ялалт/ялагдал */
export async function teamStats(sid: number, slug: string): Promise<StatRow[]> {
  const [teams, sums, wl] = await Promise.all([
    query<{ stid: number; team_id: number; name: string; logo_path: string | null }>(
      'SELECT st.id AS stid, t.id AS team_id, t.name, t.logo_path FROM season_teams st JOIN teams t ON t.id=st.team_id WHERE st.season_id=?',
      [sid],
    ),
    query<Sums & { team_id: number }>(
      `SELECT mps.team_id, ${SUMS}
       FROM match_player_stats mps JOIN matches m ON m.id=mps.match_id
       WHERE m.season_id=? GROUP BY mps.team_id`,
      [sid],
    ),
    query<{ team_id: number; w: number; l: number }>(
      `SELECT st.team_id,
         SUM(CASE WHEN (m.home_season_team_id=st.id AND m.home_score>m.away_score) OR (m.away_season_team_id=st.id AND m.away_score>m.home_score) THEN 1 ELSE 0 END) AS w,
         SUM(CASE WHEN (m.home_season_team_id=st.id AND m.home_score<m.away_score) OR (m.away_season_team_id=st.id AND m.away_score<m.home_score) THEN 1 ELSE 0 END) AS l
       FROM season_teams st
       JOIN matches m ON m.season_id=st.season_id AND m.status='finished' AND (m.home_season_team_id=st.id OR m.away_season_team_id=st.id)
       WHERE st.season_id=? GROUP BY st.team_id`,
      [sid],
    ),
  ]);
  const byTeam = new Map(sums.map((s) => [s.team_id, s]));
  const wlBy = new Map(wl.map((x) => [x.team_id, x]));
  return teams.map((t) => {
    const s = byTeam.get(t.team_id);
    const rec = wlBy.get(t.team_id);
    return {
      id: t.stid,
      href: teamPath(slug, sid, t.stid),
      name: tc(t.name),
      sub: '',
      photo: t.logo_path ? fileUrl(t.logo_path) : null,
      pos: null,
      v: { ...(s ? perGame(s, false) : { gp: 0 }), w: Number(rec?.w ?? 0), l: Number(rec?.l ?? 0) },
    };
  });
}
