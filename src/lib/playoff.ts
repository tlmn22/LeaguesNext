import 'server-only';
import { cache } from 'react';
import { query, queryOne } from './db';
import { bracketOrder, parseBestOf, roundCount, roundName, winsNeeded } from './playoff-shared';

export type Playoff = { id: number; season_id: number; team_count: number; best_of: number[] };
export type PTeam = { stid: number; name: string; logo: string | null; seed: number };
export type PGame = {
  id: number; match_datetime: string | null; status: string; game_no: number | null;
  home_stid: number; away_stid: number; home_score: number; away_score: number;
};
export type Series = {
  round: number; index: number; key: string;
  a: PTeam | null; b: PTeam | null;
  winsA: number; winsB: number; bestOf: number; need: number;
  winner: PTeam | null;
  /** Нэг тал нь хоосон — нөгөө баг тоглолтгүй дараагийн шатанд гарна */
  bye: boolean;
  /** Хоёр тал хоосон (баг хүрэлцээгүй) */
  empty: boolean;
  games: PGame[];
};
export type Round = { name: string; bestOf: number; series: Series[] };
export type Bracket = { playoff: Playoff; rounds: Round[]; champion: PTeam | null; seeds: PTeam[] };

/** Migration ажиллаагүй (хүснэгт байхгүй) үед сайт унахгүй — плейофф байхгүй гэж үзнэ */
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if ((e as { code?: string }).code === '42P01') return fallback;
    throw e;
  }
}

export const getPlayoff = cache(async (sid: number): Promise<Playoff | null> => {
  const p = await safe(
    () => queryOne<{ id: number; season_id: number; team_count: number; best_of: string }>(
      'SELECT id, season_id, team_count, best_of FROM playoffs WHERE season_id=?',
      [sid],
    ),
    null,
  );
  if (!p) return null;
  const n = Number(p.team_count);
  return { id: p.id, season_id: p.season_id, team_count: n, best_of: parseBestOf(p.best_of, roundCount(n)) };
});

/** Улирлын плейофф + seed-үүд + тоглолтуудаас тооцоолсон сүлжээ */
export const getBracket = cache(async (sid: number): Promise<Bracket | null> => {
  const playoff = await getPlayoff(sid);
  if (!playoff) return null;

  const [seeds, games] = await Promise.all([
    query<{ stid: number; name: string; logo: string | null; seed: number }>(
      `SELECT ps.season_team_id AS stid, t.name, t.logo_path AS logo, ps.seed
       FROM playoff_seeds ps JOIN season_teams st ON st.id=ps.season_team_id JOIN teams t ON t.id=st.team_id
       WHERE ps.playoff_id=? ORDER BY ps.seed`,
      [playoff.id],
    ),
    query<PGame>(
      `SELECT id, match_datetime, status, game_no, home_season_team_id AS home_stid, away_season_team_id AS away_stid,
              COALESCE(home_score,0) AS home_score, COALESCE(away_score,0) AS away_score
       FROM matches WHERE season_id=? AND stage='playoff' AND status<>'cancelled'
       ORDER BY match_datetime, id`,
      [sid],
    ),
  ]);

  const bySeed = new Map(seeds.map((s) => [Number(s.seed), { ...s, seed: Number(s.seed) }]));
  const n = playoff.team_count;
  const order = bracketOrder(n);
  const rounds: Round[] = [];

  for (let r = 0; r < roundCount(n); r++) {
    const bestOf = playoff.best_of[r];
    const need = winsNeeded(bestOf);
    const count = n >> (r + 1);
    const list: Series[] = [];
    for (let i = 0; i < count; i++) {
      let a: PTeam | null;
      let b: PTeam | null;
      let childEmptyA: boolean;
      let childEmptyB: boolean;
      if (r === 0) {
        a = bySeed.get(order[2 * i]) ?? null;
        b = bySeed.get(order[2 * i + 1]) ?? null;
        childEmptyA = !a;
        childEmptyB = !b;
      } else {
        const ca = rounds[r - 1].series[2 * i];
        const cb = rounds[r - 1].series[2 * i + 1];
        a = ca.winner;
        b = cb.winner;
        childEmptyA = ca.empty;
        childEmptyB = cb.empty;
      }
      // Дээд seed нь дээр харагдана
      if (a && b && b.seed < a.seed) [a, b] = [b, a];

      const s: Series = {
        round: r, index: i, key: `r${r + 1}-${i + 1}`,
        a, b, winsA: 0, winsB: 0, bestOf, need, winner: null,
        bye: false, empty: childEmptyA && childEmptyB, games: [],
      };
      if (a && b) {
        const ids = new Set([a.stid, b.stid]);
        s.games = games.filter((g) => g.home_stid !== g.away_stid && ids.has(g.home_stid) && ids.has(g.away_stid));
        for (const g of s.games) {
          if (g.status !== 'finished' || g.home_score === g.away_score) continue;
          const w = g.home_score > g.away_score ? g.home_stid : g.away_stid;
          if (w === a.stid) s.winsA++;
          else s.winsB++;
        }
        if (s.winsA >= need) s.winner = a;
        else if (s.winsB >= need) s.winner = b;
      } else if ((a && childEmptyB) || (b && childEmptyA)) {
        s.bye = true;
        s.winner = a ?? b;
      }
      list.push(s);
    }
    rounds.push({ name: roundName(n >> r), bestOf, series: list });
  }

  const final = rounds[rounds.length - 1]?.series[0];
  return { playoff, rounds, champion: final?.winner ?? null, seeds: [...bySeed.values()] };
});

/** Тоглолтын stage шүүлтүүр — хүснэгт/статистикт ашиглана ("m" alias-тай) */
export type Phase = 'regular' | 'playoff';
export const phaseSql = (phase: Phase) => (phase === 'playoff' ? "m.stage='playoff'" : "COALESCE(m.stage,'regular')<>'playoff'");

/** Улиралд плейоффын тоглолт байгаа эсэх (статистикийн сэлгүүр харуулах эсэх) */
export async function hasPlayoffGames(sid: number): Promise<boolean> {
  const r = await queryOne<{ x: number }>("SELECT 1 AS x FROM matches WHERE season_id=? AND stage='playoff' LIMIT 1", [sid]);
  return !!r;
}
