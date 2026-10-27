/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { cache } from 'react';
import { query, queryOne } from '@/lib/db';
import { accentOf, fileUrl, fmtDate, fmtMin, initials, resolveStreamSrc, upper3 } from '@/lib/format';
import { leagueHref } from '@/components/public/LeagueCard';

export const dynamic = 'force-dynamic';

type Match = {
  id: number; season_id: number; match_datetime: string; status: string; home_score: number; away_score: number;
  arena_name: string | null; live_embed_code: string | null;
  lg_name: string; lg_slug: string | null; lid: number; primary_color: string | null; sid: number; sname: string;
  ht: string; hl: string | null; htid: number; at: string; al: string | null; atid: number;
};

type PlayerStat = {
  player_id: number; minutes: number | null; seconds: number | null; points: number;
  two_made: number; two_attempts: number; three_made: number; three_attempts: number; ft_made: number; ft_attempts: number;
  reb_total: number; assists: number; steals: number; blocks: number; turnovers: number; fouls_committed: number; plus_minus: number | null;
  first_name: string; last_name: string; photo_path: string | null; jersey_no: string | null; position: string | null;
};

const getMatch = cache(async (id: number) =>
  queryOne<Match>(
    `SELECT m.id, m.season_id, m.match_datetime, m.status, m.home_score, m.away_score, m.arena_name, m.live_embed_code,
            l.name AS lg_name, l.slug AS lg_slug, l.id AS lid, l.primary_color, s.id AS sid, s.name AS sname,
            ht.name AS ht, ht.logo_path AS hl, ht.id AS htid, at2.name AS at, at2.logo_path AS al, at2.id AS atid
     FROM matches m
     JOIN seasons s ON s.id = m.season_id
     JOIN leagues l ON l.id = s.league_id
     JOIN season_teams hst ON hst.id = m.home_season_team_id
     JOIN season_teams ast2 ON ast2.id = m.away_season_team_id
     JOIN teams ht ON ht.id = hst.team_id
     JOIN teams at2 ON at2.id = ast2.team_id
     WHERE m.id = ?`,
    [id],
  ),
);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const m = await getMatch(parseInt((await params).id, 10) || 0);
  if (!m) return { title: 'Тоглолт' };
  return {
    title: `${m.ht} vs ${m.at}`,
    description: `${m.lg_name} · ${m.sname} · ${fmtDate(m.match_datetime, 'Y.m.d')}${m.status === 'finished' ? ` · ${m.home_score}:${m.away_score}` : ''}`,
  };
}

async function getPlayers(matchId: number, seasonId: number, teamId: number) {
  return query<PlayerStat>(
    `SELECT mps.player_id, mps.minutes, mps.seconds, mps.points, mps.two_made, mps.two_attempts, mps.three_made, mps.three_attempts,
            mps.ft_made, mps.ft_attempts, mps.reb_total, mps.assists, mps.steals, mps.blocks, mps.turnovers, mps.fouls_committed, mps.plus_minus,
            p.first_name, p.last_name, p.photo_path,
            (SELECT MAX(tsr.jersey_no) FROM team_season_roster tsr JOIN season_teams st ON st.id = tsr.season_team_id
              WHERE tsr.player_id = mps.player_id AND st.season_id = ?) AS jersey_no,
            (SELECT MAX(tsr.position) FROM team_season_roster tsr JOIN season_teams st ON st.id = tsr.season_team_id
              WHERE tsr.player_id = mps.player_id AND st.season_id = ?) AS position
     FROM match_player_stats mps
     JOIN players p ON p.id = mps.player_id
     WHERE mps.match_id = ? AND mps.team_id = ?
     ORDER BY (COALESCE(mps.minutes,0)*60 + COALESCE(mps.seconds,0)) DESC, mps.points DESC`,
    [seasonId, seasonId, matchId, teamId],
  );
}

function totals(ps: PlayerStat[]) {
  const t = { min: 0, sec: 0, pts: 0, t2m: 0, t2a: 0, t3m: 0, t3a: 0, ftm: 0, fta: 0, reb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0, fgm: 0, fga: 0 };
  for (const p of ps) {
    t.min += p.minutes ?? 0; t.sec += p.seconds ?? 0; t.pts += p.points;
    t.t2m += p.two_made; t.t2a += p.two_attempts; t.t3m += p.three_made; t.t3a += p.three_attempts;
    t.ftm += p.ft_made; t.fta += p.ft_attempts; t.reb += p.reb_total; t.ast += p.assists;
    t.stl += p.steals; t.blk += p.blocks; t.to += p.turnovers; t.pf += p.fouls_committed;
  }
  t.min += Math.floor(t.sec / 60); t.sec %= 60;
  t.fgm = t.t2m + t.t3m; t.fga = t.t2a + t.t3a;
  return t;
}

const TH = 'text-center w-11 py-3 px-2 font-medium text-[11px]';

function BoxScore({ players, teamName, logo, ac }: { players: PlayerStat[]; teamName: string; logo: string | null; ac: string }) {
  const t = totals(players);
  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <span className="w-7 h-7 rounded-md grid place-items-center shrink-0 overflow-hidden font-display text-xs" style={{ background: ac + '1a', color: ac }}>
          {logo ? <img src={fileUrl(logo)} alt="" className="w-full h-full object-contain" /> : initials(teamName)}
        </span>
        <h3 className="font-display text-xl uppercase tracking-wide">{teamName}</h3>
      </div>
      <div className="overflow-x-auto border-t border-line2">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted uppercase tracking-tight">
              <th className="sticky-col text-left py-3 pr-3 font-medium text-[11px] bg-surface">Тоглогч</th>
              <th className={TH}>MIN</th>
              <th className="text-center w-11 py-3 px-2 font-semibold text-[11px]" style={{ color: ac }}>PTS</th>
              <th className={`${TH} w-14`}>FGM/A</th>
              <th className={`${TH} w-14`}>2PM/A</th>
              <th className={`${TH} w-14`}>3PM/A</th>
              <th className={`${TH} w-14`}>FTM/A</th>
              <th className={TH}>REB</th>
              <th className={TH}>AST</th>
              <th className={TH}>STL</th>
              <th className={TH}>BLK</th>
              <th className={TH}>TO</th>
              <th className={TH}>PF</th>
              <th className={TH}>+/-</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const dnp = !p.minutes && !p.seconds && !p.points && !p.reb_total && !p.assists;
              const abbr = `${initials(p.last_name, 1)}.${p.first_name}`;
              const full = `${p.last_name} ${p.first_name}`;
              if (dnp)
                return (
                  <tr key={p.player_id} className="border-b border-line opacity-40">
                    <td className="sticky-col py-2.5 pr-3 bg-surface">
                      <div className="flex items-center gap-2">
                        {p.photo_path && <img src={fileUrl(p.photo_path)} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />}
                        <span className="text-[10px] text-muted w-4 shrink-0">{p.jersey_no ?? '—'}</span>
                        <span className="font-medium italic text-muted whitespace-nowrap">
                          <span className="sm:hidden">{abbr}</span>
                          <span className="hidden sm:inline">{full}</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-left text-[10px] font-medium uppercase tracking-widest text-muted" colSpan={13}>DNP</td>
                  </tr>
                );
              const pm = Number(p.plus_minus ?? 0);
              return (
                <tr key={p.player_id} className="border-b border-line hover:bg-primary/[0.04] transition-colors">
                  <td className="sticky-col py-2 pr-3 bg-surface">
                    <Link href={`/player/${p.player_id}`} className="flex items-center gap-2 hover:text-primary">
                      {p.photo_path ? (
                        <img src={fileUrl(p.photo_path)} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-line grid place-items-center font-display text-xs shrink-0" style={{ color: ac }}>{initials(p.last_name, 1)}</div>
                      )}
                      <span className="text-[10px] text-muted w-4 shrink-0">{p.jersey_no ?? '—'}</span>
                      <span className="font-medium whitespace-nowrap">
                        <span className="sm:hidden">{abbr}</span>
                        <span className="hidden sm:inline">{full}</span>
                      </span>
                      {p.position && <span className="text-[10px] text-muted shrink-0">{p.position}</span>}
                    </Link>
                  </td>
                  <td className="text-center py-3 px-2 text-ink2">{fmtMin(p.minutes, p.seconds)}</td>
                  <td className="text-center py-3 px-2 font-semibold text-sm" style={{ color: ac }}>{p.points}</td>
                  <td className="text-center py-3 px-2 text-ink2">{p.two_made + p.three_made}-{p.two_attempts + p.three_attempts}</td>
                  <td className="text-center py-3 px-2 text-ink2">{p.two_made}-{p.two_attempts}</td>
                  <td className="text-center py-3 px-2 text-ink2">{p.three_made}-{p.three_attempts}</td>
                  <td className="text-center py-3 px-2 text-ink2">{p.ft_made}-{p.ft_attempts}</td>
                  <td className="text-center py-3 px-2 font-medium">{p.reb_total}</td>
                  <td className="text-center py-3 px-2 font-medium">{p.assists}</td>
                  <td className="text-center py-3 px-2">{p.steals}</td>
                  <td className="text-center py-3 px-2">{p.blocks}</td>
                  <td className="text-center py-3 px-2">{p.turnovers}</td>
                  <td className="text-center py-3 px-2">{p.fouls_committed}</td>
                  <td className={`text-center py-3 px-2 font-semibold ${pm > 0 ? 'text-open' : pm < 0 ? 'text-live' : 'text-muted'}`}>{pm > 0 ? `+${pm}` : pm}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line2 text-xs font-semibold">
              <td className="sticky-col py-3.5 pr-3 text-[11px] uppercase tracking-widest text-muted font-medium bg-surface whitespace-nowrap">Нийт дүн</td>
              <td className="text-center py-3.5 px-2 text-ink2">{fmtMin(t.min, t.sec)}</td>
              <td className="text-center py-3.5 px-2 text-sm" style={{ color: ac }}>{t.pts}</td>
              <td className="text-center py-3.5 px-2">{t.fgm}-{t.fga}</td>
              <td className="text-center py-3.5 px-2">{t.t2m}-{t.t2a}</td>
              <td className="text-center py-3.5 px-2">{t.t3m}-{t.t3a}</td>
              <td className="text-center py-3.5 px-2">{t.ftm}-{t.fta}</td>
              <td className="text-center py-3.5 px-2">{t.reb}</td>
              <td className="text-center py-3.5 px-2">{t.ast}</td>
              <td className="text-center py-3.5 px-2">{t.stl}</td>
              <td className="text-center py-3.5 px-2">{t.blk}</td>
              <td className="text-center py-3.5 px-2 text-live">{t.to}</td>
              <td className="text-center py-3.5 px-2">{t.pf}</td>
              <td className="text-center py-3.5 px-2 text-muted">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id, 10) || 0;
  const m = await getMatch(id);
  if (!m) notFound();

  const ac = accentOf(m.primary_color);
  const [qs, home, away] = await Promise.all([
    query<{ period: string; home_score: number; away_score: number }>(
      "SELECT period, home_score, away_score FROM match_status WHERE match_id=? ORDER BY CASE period WHEN 'Q1' THEN 1 WHEN 'Q2' THEN 2 WHEN 'Q3' THEN 3 WHEN 'Q4' THEN 4 WHEN 'OT' THEN 5 ELSE 0 END",
      [id],
    ),
    getPlayers(id, m.season_id, m.htid),
    getPlayers(id, m.season_id, m.atid),
  ]);

  const ha = upper3(m.ht);
  const aa = upper3(m.at);
  const fin = m.status === 'finished';
  const day = m.match_datetime?.slice(0, 10);
  const stream = resolveStreamSrc(m.live_embed_code);
  const lgSlug = m.lg_slug || String(m.lid);

  return (
    <>
      {/* Mobile score bar */}
      <div className="sm:hidden" style={{ background: '#161826' }}>
        <a href="#boxscore" className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <span className="w-8 h-8 rounded-full grid place-items-center overflow-hidden text-[10px] font-bold text-white bg-white/10">
                {m.hl ? <img src={fileUrl(m.hl)} alt="" className="w-full h-full object-cover" /> : ha}
              </span>
              <span className="text-[10px] font-bold uppercase text-white/60">{ha}</span>
            </div>
            <span className={`font-display text-3xl tabular-nums ${fin && m.home_score < m.away_score ? 'text-white/50' : 'text-white'}`}>{m.home_score}</span>
          </div>
          <div className="flex flex-col items-center gap-1 px-2 shrink-0">
            {m.status === 'live' ? (
              <span className="w-1.5 h-1.5 rounded-full bg-live live-dot" />
            ) : (
              <span className="material-icons-round text-primary text-base leading-none">sports_basketball</span>
            )}
            <span className="text-[9px] font-bold uppercase text-white/60 whitespace-nowrap">
              {fin ? 'Дууссан' : m.status === 'live' ? 'Шууд' : fmtDate(m.match_datetime, 'H:i')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`font-display text-3xl tabular-nums ${fin && m.away_score < m.home_score ? 'text-white/50' : 'text-white'}`}>{m.away_score}</span>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <span className="w-8 h-8 rounded-full grid place-items-center overflow-hidden text-[10px] font-bold text-white bg-white/10">
                {m.al ? <img src={fileUrl(m.al)} alt="" className="w-full h-full object-cover" /> : aa}
              </span>
              <span className="text-[10px] font-bold uppercase text-white/60">{aa}</span>
            </div>
          </div>
        </a>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-2 text-xs text-muted mb-8 flex-wrap">
          <Link href="/" className="hover:text-primary transition-colors">LeagueMN</Link>
          <span>/</span>
          <Link href={leagueHref(lgSlug, m.lid, m.sid)} className="hover:text-primary transition-colors">{m.lg_name}</Link>
          <span>/</span>
          <Link href={`/schedule?d=${day}`} className="hover:text-primary transition-colors">{fmtDate(m.match_datetime, 'Y.m.d')}</Link>
          <span>/</span>
          <span>{m.ht} — {m.at}</span>
        </div>

        {/* Score header */}
        <div className="hidden sm:grid grid-cols-[1fr_auto_1fr] items-center gap-6 sm:gap-10 pb-8 border-b border-line">
          <div className="flex items-center gap-3 sm:gap-4 justify-end text-right">
            <div className="min-w-0">
              <div className="font-display text-xl sm:text-3xl uppercase leading-tight truncate">{m.ht}</div>
              <div className="text-xs text-muted mt-1">Гэрийн баг</div>
            </div>
            <span className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg grid place-items-center shrink-0 overflow-hidden font-display text-lg sm:text-2xl" style={{ background: ac + '1a', color: ac }}>
              {m.hl ? <img src={fileUrl(m.hl)} alt="" className="w-full h-full object-contain p-1" /> : initials(m.ht)}
            </span>
          </div>

          <div className="text-center shrink-0">
            {fin ? (
              <>
                <div className="flex items-baseline gap-2 sm:gap-4 font-display text-4xl sm:text-6xl md:text-7xl tracking-tighter">
                  <span className={m.home_score >= m.away_score ? '' : 'text-muted'}>{m.home_score}</span>
                  <span className="text-line2 text-2xl sm:text-4xl">—</span>
                  <span className={m.away_score >= m.home_score ? '' : 'text-muted'}>{m.away_score}</span>
                </div>
                <div className="mt-3 text-[11px] font-medium uppercase tracking-widest text-done">Дууссан</div>
              </>
            ) : m.status === 'scheduled' ? (
              <>
                <div className="font-display text-3xl sm:text-5xl text-muted">{fmtDate(m.match_datetime, 'H:i')}</div>
                <div className="mt-2 text-[11px] font-medium uppercase tracking-widest text-muted">Хуваарьт</div>
              </>
            ) : m.status === 'cancelled' ? (
              <>
                <div className="font-display text-3xl sm:text-5xl text-muted">—</div>
                <div className="mt-2 text-[11px] font-medium uppercase tracking-widest text-live">Цуцлагдсан</div>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-2 sm:gap-4 font-display text-4xl sm:text-6xl tracking-tighter">
                  <span>{m.home_score}</span>
                  <span className="text-live text-2xl live-dot">●</span>
                  <span>{m.away_score}</span>
                </div>
                <div className="mt-3 text-[11px] font-medium uppercase tracking-widest text-live">Шууд</div>
              </>
            )}
            <div className="mt-3 text-xs text-muted">
              {fmtDate(m.match_datetime, 'Y.m.d H:i')}
              {m.arena_name ? ` · ${m.arena_name}` : ''}
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <span className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg grid place-items-center shrink-0 overflow-hidden font-display text-lg sm:text-2xl" style={{ background: ac + '1a', color: ac }}>
              {m.al ? <img src={fileUrl(m.al)} alt="" className="w-full h-full object-contain p-1" /> : initials(m.at)}
            </span>
            <div className="min-w-0">
              <div className="font-display text-xl sm:text-3xl uppercase leading-tight truncate">{m.at}</div>
              <div className="text-xs text-muted mt-1">Зочин</div>
            </div>
          </div>
        </div>

        <div className="space-y-10 pt-8">
          {stream && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 bg-live rounded-full live-dot shrink-0" />
                <h3 className="font-medium text-[13px] uppercase tracking-widest text-live">Шууд дамжуулалт</h3>
              </div>
              <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={stream}
                  className="absolute inset-0 w-full h-full"
                  style={{ border: 0 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  title={`${m.ht} vs ${m.at}`}
                />
              </div>
            </section>
          )}

          {qs.length > 0 && (
            <section>
              <h3 className="font-medium text-[13px] uppercase tracking-widest text-muted mb-3">Улирлын дүн</h3>
              <div className="overflow-x-auto">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th className="min-w-[120px]">Баг</th>
                      {qs.map((q) => (
                        <th key={q.period} className="!text-center">{q.period}</th>
                      ))}
                      <th className="!text-center">Нийт</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(['home', 'away'] as const).map((side) => {
                      const name = side === 'home' ? m.ht : m.at;
                      const logo = side === 'home' ? m.hl : m.al;
                      const my = side === 'home' ? m.home_score : m.away_score;
                      const op = side === 'home' ? m.away_score : m.home_score;
                      return (
                        <tr key={side}>
                          <td>
                            <div className="flex items-center gap-2">
                              {logo && <img src={fileUrl(logo)} alt="" className="w-6 h-6 rounded object-cover" />}
                              <span className="font-medium truncate">{name}</span>
                            </div>
                          </td>
                          {qs.map((q) => {
                            const a = side === 'home' ? q.home_score : q.away_score;
                            const b = side === 'home' ? q.away_score : q.home_score;
                            return (
                              <td key={q.period} className={`text-center tabular-nums ${a > b ? 'font-medium' : 'text-muted'}`}>{a}</td>
                            );
                          })}
                          <td className="text-center">
                            <span className={`font-display text-xl ${my >= op ? '' : 'text-muted'}`} style={my >= op ? { color: ac } : undefined}>{my}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <div id="boxscore" />
          <BoxScore players={home} teamName={m.ht} logo={m.hl} ac={ac} />
          <BoxScore players={away} teamName={m.at} logo={m.al} ac={ac} />

          <div className="flex items-center justify-between pt-2">
            <Link href={`/schedule?d=${day}`} className="inline-flex items-center gap-2 text-sm font-medium text-ink2 hover:text-primary transition-colors">
              <span className="material-icons-round text-lg">arrow_back</span> Тоглолтууд руу буцах
            </Link>
            <Link href={leagueHref(lgSlug, m.lid, m.sid, 'matches')} className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors" style={{ color: ac }}>
              {m.lg_name} <span className="material-icons-round text-lg">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
