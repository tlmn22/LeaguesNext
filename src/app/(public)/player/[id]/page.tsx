/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { cache } from 'react';
import { query, queryOne } from '@/lib/db';
import { accentOf, fileUrl, fmtDate, initials, pct, resolveStreamSrc, round1 } from '@/lib/format';
import { leagueHref } from '@/components/public/LeagueCard';
import { NavSelect } from '@/components/public/NavSelect';
import ShareCard, { type ShareAvg } from '@/components/public/ShareCard';
import BackLink from '@/components/public/BackLink';

export const dynamic = 'force-dynamic';

type Player = { id: number; last_name: string; first_name: string; photo_path: string | null; height_cm: number | null; weight_kg: number | null };
type Hist = {
  jersey_no: string | null; position: string | null; tid: number; tname: string; tlogo: string | null;
  sid: number; sname: string; sstatus: string; lid: number; lname: string; lslug: string | null; lac: string | null;
};
type Game = {
  mid: number; match_datetime: string; home_score: number; away_score: number; live_embed_code: string | null;
  ht: string; hl: string | null; home_team_id: number; atn: string; al: string | null; team_id: number;
  minutes: number | null; seconds: number | null; points: number; reb_total: number; assists: number; steals: number; blocks: number;
  turnovers: number; fouls_committed: number; plus_minus: number | null;
  two_made: number; two_attempts: number; three_made: number; three_attempts: number; ft_made: number; ft_attempts: number;
};

const getPlayer = cache(async (id: number) =>
  queryOne<Player>('SELECT id, last_name, first_name, photo_path, height_cm, weight_kg FROM players WHERE id=?', [id]),
);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await getPlayer(parseInt((await params).id, 10) || 0);
  return { title: p ? `${p.last_name} ${p.first_name}` : 'Тоглогч' };
}

export default async function PlayerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string }> }) {
  const pid = parseInt((await params).id, 10) || 0;
  const player = await getPlayer(pid);
  if (!player) notFound();
  let filterSid = parseInt((await searchParams).s ?? '', 10) || 0;

  const history = await query<Hist>(
    `SELECT tsr.jersey_no, tsr.position,
            t.id AS tid, t.name AS tname, t.logo_path AS tlogo,
            s.id AS sid, s.name AS sname, s.status AS sstatus,
            l.id AS lid, l.name AS lname, l.slug AS lslug, l.primary_color AS lac
     FROM team_season_roster tsr
     JOIN season_teams st ON st.id = tsr.season_team_id
     JOIN teams t ON t.id = st.team_id
     JOIN seasons s ON s.id = st.season_id
     JOIN leagues l ON l.id = s.league_id
     WHERE tsr.player_id = ?
     ORDER BY s.id DESC`,
    [pid],
  );

  let cur = history.find((h) => h.sid === filterSid) ?? null;
  if (!cur && history.length) {
    cur = history[0];
    filterSid = cur.sid;
  }

  const games = filterSid
    ? await query<Game>(
        `SELECT mps.team_id, mps.minutes, mps.seconds, mps.points, mps.reb_total, mps.assists, mps.steals, mps.blocks,
                mps.turnovers, mps.fouls_committed, mps.plus_minus, mps.two_made, mps.two_attempts, mps.three_made,
                mps.three_attempts, mps.ft_made, mps.ft_attempts,
                m.id AS mid, m.match_datetime, m.home_score, m.away_score, m.live_embed_code,
                home_team.name AS ht, home_team.logo_path AS hl, hst.team_id AS home_team_id,
                away_team.name AS atn, away_team.logo_path AS al
         FROM match_player_stats mps
         JOIN matches m ON m.id = mps.match_id
         JOIN season_teams hst ON hst.id = m.home_season_team_id
         JOIN season_teams ast ON ast.id = m.away_season_team_id
         JOIN teams home_team ON home_team.id = hst.team_id
         JOIN teams away_team ON away_team.id = ast.team_id
         WHERE mps.player_id=? AND m.season_id=? AND m.status='finished'
           AND (mps.minutes > 0 OR mps.seconds > 0)
         ORDER BY m.match_datetime DESC`,
        [pid, filterSid],
      )
    : [];

  // Улирал бүрийн GP / PPG (нэг query-ээр)
  const histStats = history.length
    ? await query<{ sid: number; gp: number; ppg: number | null }>(
        `SELECT m.season_id AS sid, COUNT(*) AS gp, ROUND(SUM(mps.points)::numeric/COUNT(*),1) AS ppg
         FROM match_player_stats mps JOIN matches m ON m.id = mps.match_id
         WHERE mps.player_id=? AND m.status='finished' AND (mps.minutes > 0 OR mps.seconds > 0)
         GROUP BY m.season_id`,
        [pid],
      )
    : [];
  const hs = new Map(histStats.map((r) => [r.sid, r]));

  let avg: (ShareAvg & { blk: number; to: number; pf: number; fg_made: number; fg_att: number; t3_made: number; t3_att: number; ft_made: number; ft_att: number }) | null = null;
  const gp = games.length;
  if (gp > 0) {
    const s = { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, to: 0, t2m: 0, t2a: 0, t3m: 0, t3a: 0, ftm: 0, fta: 0, sec: 0, pf: 0 };
    for (const g of games) {
      s.pts += g.points; s.reb += g.reb_total; s.ast += g.assists; s.stl += g.steals; s.blk += g.blocks; s.to += g.turnovers;
      s.t2m += g.two_made; s.t2a += g.two_attempts; s.t3m += g.three_made; s.t3a += g.three_attempts;
      s.ftm += g.ft_made; s.fta += g.ft_attempts; s.sec += (g.minutes ?? 0) * 60 + (g.seconds ?? 0); s.pf += g.fouls_committed;
    }
    const avgSec = Math.floor(s.sec / gp);
    avg = {
      gp,
      pts: round1(s.pts / gp), reb: round1(s.reb / gp), ast: round1(s.ast / gp), stl: round1(s.stl / gp),
      blk: round1(s.blk / gp), to: round1(s.to / gp), pf: round1(s.pf / gp),
      mpg: `${Math.floor(avgSec / 60)}:${String(avgSec % 60).padStart(2, '0')}`,
      fg_pct: pct(s.t2m + s.t3m, s.t2a + s.t3a, 1), fg_made: s.t2m + s.t3m, fg_att: s.t2a + s.t3a,
      t3_pct: pct(s.t3m, s.t3a, 1), t3_made: s.t3m, t3_att: s.t3a,
      ft_pct: pct(s.ftm, s.fta, 1), ft_made: s.ftm, ft_att: s.fta,
    };
  }

  const streams = games.filter((g) => resolveStreamSrc(g.live_embed_code));
  const ac = accentOf(cur?.lac);
  const fullName = `${player.last_name} ${player.first_name}`;

  return (
    <>
      <header className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        <div className="flex items-center gap-2 text-xs text-muted mb-6 flex-wrap">
          <Link href="/" className="hover:text-primary transition-colors">LeagueMN</Link>
          {cur && (
            <>
              <span>/</span>
              <Link href={leagueHref(cur.lslug, cur.lid, cur.sid)} className="hover:text-primary transition-colors">{cur.lname}</Link>
            </>
          )}
          <span>/</span>
          <span>{fullName}</span>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 pb-7 border-b border-line flex-wrap">
          <span className="w-24 h-24 sm:w-[104px] sm:h-[104px] rounded-full grid place-items-center font-display text-3xl shrink-0 overflow-hidden" style={{ background: ac + '1a', color: ac }}>
            {player.photo_path ? <img src={fileUrl(player.photo_path)} alt="" className="w-full h-full object-cover" /> : initials(player.last_name, 1)}
          </span>
          <div className="flex-1 min-w-[260px]">
            <div className="flex items-center gap-2.5 text-xs text-muted mb-2 flex-wrap">
              {cur && (
                <>
                  <span className="w-5 h-5 rounded grid place-items-center font-display text-[10px] shrink-0" style={{ background: ac + '1a', color: ac }}>{initials(cur.tname)}</span>
                  {cur.tname}
                  {cur.position ? ` · ${cur.position}` : ''}
                </>
              )}
              {player.height_cm ? ` · ${player.height_cm} см` : ''}
              {player.weight_kg ? ` / ${player.weight_kg} кг` : ''}
            </div>
            <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] uppercase">
              {cur?.jersey_no && <span className="text-muted mr-2">#{cur.jersey_no}</span>}
              {fullName}
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {history.length > 1 && (
              <NavSelect value={filterSid} hrefTemplate={`/player/${pid}?s={v}`} className="text-sm h-9 px-3 rounded-lg border border-line2 bg-surface text-ink cursor-pointer">
                {history.map((h) => (
                  <option key={h.sid + '-' + h.tid} value={h.sid}>{h.sname} — {h.tname}</option>
                ))}
              </NavSelect>
            )}
            {avg && cur && (
              <ShareCard
                ac={ac}
                playerName={fullName}
                fileBase={`${player.last_name}_${player.first_name}`}
                photo={player.photo_path ? fileUrl(player.photo_path) : null}
                initial={initials(player.last_name, 1)}
                leagueName={cur.lname}
                seasonName={cur.sname}
                teamName={cur.tname}
                position={cur.position}
                jersey={cur.jersey_no}
                avg={avg}
              />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {avg && (
          <section>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <h2 className="font-medium text-[13px] uppercase tracking-[0.14em] text-muted">{cur?.sname}</h2>
              <div className="flex items-center gap-4 text-xs text-muted">
                <span>GP <span className="font-medium text-ink">{avg.gp}</span></span>
                <span>MPG <span className="font-medium text-ink">{avg.mpg}</span></span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-px bg-line mb-8">
              {([['PTS', avg.pts, true], ['RPG', avg.reb, false], ['APG', avg.ast, false], ['SPG', avg.stl, false], ['BPG', avg.blk, false]] as const).map(([lbl, v, main]) => (
                <div key={lbl} className="bg-surface p-3 sm:p-5">
                  <div className="font-display text-2xl sm:text-4xl leading-none" style={main ? { color: ac } : undefined}>{v}</div>
                  <div className="text-[11px] text-muted uppercase tracking-widest mt-1.5">{lbl}</div>
                </div>
              ))}
            </div>

            <h3 className="font-medium text-[13px] uppercase tracking-[0.14em] text-muted mb-4">Шидэлтийн хувь</h3>
            <div className="flex flex-wrap gap-8">
              {([
                ['FG%', avg.fg_pct, `${avg.fg_made}/${avg.fg_att}`, 'Нийт шидэлт'],
                ['3P%', avg.t3_pct, `${avg.t3_made}/${avg.t3_att}`, '3 оноо'],
                ['FT%', avg.ft_pct, `${avg.ft_made}/${avg.ft_att}`, 'Чөлөөт шидэлт'],
              ] as const).map(([lbl, val, ratio, mn]) => (
                <div key={lbl} className="flex items-center gap-3.5">
                  <div className="relative w-[70px] h-[70px] shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--lm-line2)" strokeWidth="2" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke={ac} strokeWidth="2" strokeDasharray={`${Math.min(val, 100)} 100`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-display text-lg">{val}</div>
                  </div>
                  <div>
                    <div className="font-display text-base uppercase tracking-wide">{lbl}</div>
                    <div className="text-xs text-muted mt-0.5">{ratio} · {mn}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {history.length > 1 && (
          <section>
            <h2 className="font-medium text-[13px] uppercase tracking-[0.14em] text-muted mb-4">Улирлын түүх</h2>
            <div className="border-t border-line">
              {history.map((h) => {
                const st = hs.get(h.sid);
                const sel = h.sid === filterSid;
                const badge =
                  h.sstatus === 'active' ? ['Явагдаж байна', '#22c55e'] : h.sstatus === 'registration' ? ['Бүртгэл', '#3b82f6'] : ['Дууссан', '#94a3b8'];
                return (
                  <Link
                    key={h.sid + '-' + h.tid}
                    href={`/player/${pid}?s=${h.sid}`}
                    className={`flex items-center gap-4 px-2 py-3.5 border-b border-line hover:bg-primary/[0.04] transition-colors ${sel ? 'bg-primary/[0.04]' : ''}`}
                  >
                    {h.tlogo && <img src={fileUrl(h.tlogo)} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm" style={sel ? { color: ac } : undefined}>{h.sname}</div>
                      <div className="text-xs text-muted">
                        {h.lname} · {h.tname}
                        {h.jersey_no ? ` · #${h.jersey_no}` : ''}
                        {h.position ? ` · ${h.position}` : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {st && st.gp > 0 && (
                        <>
                          <div className="font-display text-xl leading-none" style={{ color: ac }}>{st.ppg}</div>
                          <div className="text-[9px] text-muted font-medium uppercase">PPG</div>
                        </>
                      )}
                      <div className="text-[10px] text-muted mt-0.5">{st?.gp ?? 0} тоглолт</div>
                    </div>
                    <span className="text-[11px] font-medium shrink-0" style={{ color: badge[1] }}>{badge[0]}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {games.length > 0 && (
          <section>
            <h2 className="font-medium text-[13px] uppercase tracking-[0.14em] text-muted mb-4">Тоглолт бүрийн статистик</h2>
            <div className="overflow-x-auto border-t border-line2">
              <table className="w-full text-xs min-w-[760px]">
                <thead>
                  <tr className="text-muted uppercase">
                    <th className="text-left py-3 px-3 min-w-[150px] font-medium text-[11px]">Тоглолт</th>
                    <th className="text-center py-3 px-2 font-medium text-[11px]">MIN</th>
                    <th className="text-center py-3 px-2 font-semibold text-[11px]" style={{ color: ac }}>PTS</th>
                    {['REB', 'AST', 'STL', 'BLK', 'FG', '3P', 'FT', '+/-'].map((h) => (
                      <th key={h} className="text-center py-3 px-2 font-medium text-[11px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {games.map((g) => {
                    const pm = Number(g.plus_minus ?? 0);
                    const fgm = g.two_made + g.three_made;
                    const fga = g.two_attempts + g.three_attempts;
                    const isHome = g.team_id === g.home_team_id;
                    const oppLogo = isHome ? g.al : g.hl;
                    const hWin = g.home_score > g.away_score;
                    return (
                      <tr key={g.mid} className="border-b border-line hover:bg-primary/[0.04] transition-colors">
                        <td className="py-2.5 px-3">
                          <Link href={`/match/${g.mid}`} className="flex items-center gap-2">
                            <div className="shrink-0 w-8 text-center">
                              <div className="text-[10px] text-muted font-medium leading-tight">{fmtDate(g.match_datetime, 'm/d')}</div>
                              {g.live_embed_code && <span className="material-icons-round text-live" style={{ fontSize: 14 }}>videocam</span>}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                {oppLogo && <img src={fileUrl(oppLogo)} alt="" className="w-4 h-4 rounded object-cover shrink-0" />}
                                <span className="text-[11px] font-medium truncate max-w-[110px] hover:text-primary">{g.ht} – {g.atn}</span>
                              </div>
                              <div className="text-[10px] font-medium mt-0.5">
                                <span style={{ color: hWin ? ac : 'var(--lm-muted)' }}>{g.home_score}</span>
                                <span className="text-line2 mx-0.5">:</span>
                                <span style={{ color: !hWin ? ac : 'var(--lm-muted)' }}>{g.away_score}</span>
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="text-center py-2.5 px-2 text-ink2 tabular-nums">{g.minutes ?? 0}:{String(g.seconds ?? 0).padStart(2, '0')}</td>
                        <td className="text-center py-2.5 px-2 font-semibold text-sm" style={{ color: ac }}>{g.points}</td>
                        <td className="text-center py-2.5 px-2 font-medium">{g.reb_total}</td>
                        <td className="text-center py-2.5 px-2 font-medium">{g.assists}</td>
                        <td className="text-center py-2.5 px-2">{g.steals}</td>
                        <td className="text-center py-2.5 px-2">{g.blocks}</td>
                        <td className="text-center py-2.5 px-2">
                          <div className="font-medium tabular-nums">{fgm}/{fga}</div>
                          <div className="text-[9px] text-muted">{pct(fgm, fga)}%</div>
                        </td>
                        <td className="text-center py-2.5 px-2">
                          <div className="font-medium tabular-nums">{g.three_made}/{g.three_attempts}</div>
                          <div className="text-[9px] text-muted">{pct(g.three_made, g.three_attempts)}%</div>
                        </td>
                        <td className="text-center py-2.5 px-2">
                          <div className="font-medium tabular-nums">{g.ft_made}/{g.ft_attempts}</div>
                          <div className="text-[9px] text-muted">{pct(g.ft_made, g.ft_attempts)}%</div>
                        </td>
                        <td className={`text-center py-2.5 px-2 font-semibold tabular-nums ${pm > 0 ? 'text-open' : pm < 0 ? 'text-live' : 'text-muted'}`}>{pm > 0 ? `+${pm}` : pm}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {avg && (
                  <tfoot>
                    <tr className="text-xs font-semibold border-t-2 border-line2">
                      <td className="py-3.5 px-3 font-display uppercase tracking-wide">Дундаж · {avg.gp} тог.</td>
                      <td className="text-center py-3.5 px-2 text-ink2">{avg.mpg}</td>
                      <td className="text-center py-3.5 px-2" style={{ color: ac }}>{avg.pts}</td>
                      <td className="text-center py-3.5 px-2">{avg.reb}</td>
                      <td className="text-center py-3.5 px-2">{avg.ast}</td>
                      <td className="text-center py-3.5 px-2">{avg.stl}</td>
                      <td className="text-center py-3.5 px-2">{avg.blk}</td>
                      <td className="text-center py-3.5 px-2 text-ink2">{avg.fg_pct}%</td>
                      <td className="text-center py-3.5 px-2 text-ink2">{avg.t3_pct}%</td>
                      <td className="text-center py-3.5 px-2 text-ink2">{avg.ft_pct}%</td>
                      <td className="text-center py-3.5 px-2 text-muted">—</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-2.5 text-muted sm:hidden">
              <span className="material-icons-round text-sm">swipe</span>
              <span className="text-[10px] font-medium">Хажуугаар гүйлгэнэ</span>
            </div>
          </section>
        )}

        {streams.length > 0 && (
          <section>
            <h2 className="font-medium text-[13px] uppercase tracking-[0.14em] text-muted mb-4">
              Бичлэгүүд <span className="text-ink">{streams.length}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {streams.map((g) => (
                <div key={g.mid} className="border border-line rounded-lg overflow-hidden">
                  <div className="relative w-full bg-black" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      src={resolveStreamSrc(g.live_embed_code)}
                      className="absolute inset-0 w-full h-full"
                      style={{ border: 0 }}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      title={`${g.ht} vs ${g.atn}`}
                    />
                  </div>
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {g.hl && <img src={fileUrl(g.hl)} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-raise" />}
                      {g.al && <img src={fileUrl(g.al)} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-raise" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{g.ht} vs {g.atn}</div>
                      <div className="text-xs text-muted">
                        {fmtDate(g.match_datetime, 'Y.m.d')} · <span className="font-medium" style={{ color: ac }}>{g.points} оноо</span>
                      </div>
                    </div>
                    <Link href={`/match/${g.mid}`} className="text-xs font-medium flex items-center gap-0.5 shrink-0" style={{ color: ac }}>
                      Box <span className="material-icons-round text-sm">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {games.length === 0 && filterSid > 0 && (
          <div className="text-center py-16 text-muted">
            <span className="material-icons-round text-5xl block mb-3 text-line2">sports_basketball</span>
            <p className="text-sm">Энэ улиралд статистик байхгүй байна</p>
          </div>
        )}

        <div className="pt-2 pb-2">
          <BackLink />
        </div>
      </main>
    </>
  );
}
