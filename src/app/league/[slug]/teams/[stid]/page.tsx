/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { query, queryOne } from '@/lib/db';
import { getLeagueCtx, lgPath } from '@/lib/league';
import { fileUrl, initials, round1, tc } from '@/lib/format';
import LeagueShell from '@/components/league/LeagueShell';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ slug: string; stid: string }>; searchParams: Promise<{ s?: string }> };

type Team = { stid: number; team_id: number; name: string; logo_path: string | null; zone: string | null; season_id: number };

async function loadTeam(stid: number) {
  return queryOne<Team>(
    'SELECT st.id AS stid, st.team_id, st.season_id, t.name, t.logo_path, st.zone FROM season_teams st JOIN teams t ON t.id=st.team_id WHERE st.id=?',
    [stid],
  );
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const team = await loadTeam(parseInt((await params).stid, 10) || 0);
  return { title: team ? tc(team.name) : 'Баг' };
}

export default async function TeamDetail({ params }: P) {
  const { slug: slugParam, stid: stidParam } = await params;
  const stid = parseInt(stidParam, 10) || 0;
  const team = await loadTeam(stid);
  if (!team) notFound();
  // Улирлыг багаас нь тодорхойлно (s параметрээс үл хамааран)
  const ctx = await getLeagueCtx(slugParam, String(team.season_id));
  if (ctx.sid !== team.season_id) notFound();
  const { sid, ac, slug } = ctx;

  const [ts, roster, matches] = await Promise.all([
    queryOne<{ gp: number; wins: number; losses: number; pts_for: number; pts_ag: number }>(
      `SELECT
         COUNT(CASE WHEN m.status='finished' THEN 1 END) AS gp,
         COUNT(CASE WHEN m.status='finished' AND ((m.home_season_team_id=st.id AND m.home_score>m.away_score) OR (m.away_season_team_id=st.id AND m.away_score>m.home_score)) THEN 1 END) AS wins,
         COUNT(CASE WHEN m.status='finished' AND ((m.home_season_team_id=st.id AND m.home_score<m.away_score) OR (m.away_season_team_id=st.id AND m.away_score<m.home_score)) THEN 1 END) AS losses,
         COALESCE(SUM(CASE WHEN m.status='finished' AND m.home_season_team_id=st.id THEN m.home_score WHEN m.status='finished' AND m.away_season_team_id=st.id THEN m.away_score ELSE 0 END),0) AS pts_for,
         COALESCE(SUM(CASE WHEN m.status='finished' AND m.home_season_team_id=st.id THEN m.away_score WHEN m.status='finished' AND m.away_season_team_id=st.id THEN m.home_score ELSE 0 END),0) AS pts_ag
       FROM season_teams st
       LEFT JOIN matches m ON m.season_id=st.season_id AND (m.home_season_team_id=st.id OR m.away_season_team_id=st.id)
       WHERE st.id=?`,
      [stid],
    ),
    query<{ id: number; first_name: string; last_name: string; photo_path: string | null; jersey_no: string | null; position: string | null; gp: number; ppg: number | null; rpg: number | null; apg: number | null }>(
      `SELECT p.id, p.first_name, p.last_name, p.photo_path, tsr.jersey_no, tsr.position,
              COUNT(DISTINCT mps.match_id) AS gp,
              ROUND(SUM(mps.points)::numeric/NULLIF(COUNT(DISTINCT mps.match_id),0),1) AS ppg,
              ROUND(SUM(mps.reb_total)::numeric/NULLIF(COUNT(DISTINCT mps.match_id),0),1) AS rpg,
              ROUND(SUM(mps.assists)::numeric/NULLIF(COUNT(DISTINCT mps.match_id),0),1) AS apg
       FROM team_season_roster tsr
       JOIN players p ON p.id=tsr.player_id
       LEFT JOIN (
         SELECT mps.* FROM match_player_stats mps JOIN matches m ON m.id = mps.match_id
         WHERE m.season_id = ? AND (mps.minutes > 0 OR mps.seconds > 0)
       ) mps ON mps.player_id=p.id AND mps.team_id=?
       WHERE tsr.season_team_id=? AND tsr.status='active'
       GROUP BY p.id, p.first_name, p.last_name, p.photo_path, tsr.jersey_no, tsr.position
       ORDER BY tsr.jersey_no IS NULL, CASE WHEN tsr.jersey_no ~ '^[0-9]+$' THEN tsr.jersey_no::integer ELSE 0 END, p.last_name`,
      [sid, team.team_id, stid],
    ),
    query<{ id: number; home_score: number; away_score: number; ht: string; hl: string | null; at: string; al: string | null; side: 'home' | 'away' }>(
      `SELECT m.id, m.home_score, m.away_score, ht.name AS ht, ht.logo_path AS hl, at2.name AS at, at2.logo_path AS al,
              CASE WHEN m.home_season_team_id=? THEN 'home' ELSE 'away' END AS side
       FROM matches m
       JOIN season_teams hst ON hst.id=m.home_season_team_id
       JOIN season_teams ast ON ast.id=m.away_season_team_id
       JOIN teams ht ON ht.id=hst.team_id
       JOIN teams at2 ON at2.id=ast.team_id
       WHERE m.season_id=? AND (m.home_season_team_id=? OR m.away_season_team_id=?) AND m.status='finished'
       ORDER BY m.match_datetime DESC LIMIT 5`,
      [stid, sid, stid, stid],
    ),
  ]);

  const s = ts ?? { gp: 0, wins: 0, losses: 0, pts_for: 0, pts_ag: 0 };
  const gp = Number(s.gp);
  const pctW = gp ? Math.round((Number(s.wins) / gp) * 100) : 0;
  const diff = Number(s.pts_for) - Number(s.pts_ag);

  return (
    <LeagueShell ctx={ctx} active="teams">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center gap-2 text-sm text-muted mb-6">
          <Link href={lgPath(slug, sid, 'teams')} className="hover:text-primary transition-colors">Багууд</Link>
          <span className="material-icons-round text-base">chevron_right</span>
          <span className="text-ink font-semibold">{tc(team.name)}</span>
        </div>

        <div className="border border-line rounded-lg overflow-hidden mb-8">
          <div className="h-1" style={{ background: ac }} />
          <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-line flex items-center justify-center shrink-0">
              {team.logo_path ? (
                <img src={fileUrl(team.logo_path)} alt="" className="w-full h-full object-contain p-2" />
              ) : (
                <span className="font-display text-3xl" style={{ color: ac }}>{initials(tc(team.name))}</span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-display tracking-wide">{tc(team.name)}</h1>
              {team.zone && (
                <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full text-white mt-2 inline-block" style={{ background: ac }}>
                  {team.zone} бүс
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="font-display text-3xl" style={{ color: ac }}>{gp}</div>
                <div className="text-[10px] text-muted font-bold uppercase mt-0.5">Тоглолт</div>
              </div>
              <div>
                <div className="font-display text-3xl text-open">{s.wins}</div>
                <div className="text-[10px] text-muted font-bold uppercase mt-0.5">Хожил</div>
              </div>
              <div>
                <div className="font-display text-3xl text-live">{s.losses}</div>
                <div className="text-[10px] text-muted font-bold uppercase mt-0.5">Хожигдол</div>
              </div>
              <div>
                <div className="font-display text-3xl" style={{ color: ac }}>{pctW}%</div>
                <div className="text-[10px] text-muted font-bold uppercase mt-0.5">Хувь</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
            <div className="px-3 sm:px-6 py-4 text-center">
              <div className="font-display text-2xl" style={{ color: ac }}>{gp ? round1(Number(s.pts_for) / gp) : 0}</div>
              <div className="text-[11px] text-muted font-bold uppercase mt-0.5">Дундаж оноо авалт</div>
            </div>
            <div className="px-3 sm:px-6 py-4 text-center">
              <div className="font-display text-2xl text-muted">{gp ? round1(Number(s.pts_ag) / gp) : 0}</div>
              <div className="text-[11px] text-muted font-bold uppercase mt-0.5">Дундаж оноо алдалт</div>
            </div>
            <div className="px-3 sm:px-6 py-4 text-center">
              <div className={`font-display text-2xl ${diff >= 0 ? 'text-open' : 'text-live'}`}>{diff >= 0 ? `+${diff}` : diff}</div>
              <div className="text-[11px] text-muted font-bold uppercase mt-0.5">Зөрүү</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-display mb-4">
              Тоглогчид <span className="text-line2">{roster.length}</span>
            </h2>
            <div className="border border-line rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white text-[10px] font-bold uppercase" style={{ background: ac }}>
                      <th className="px-4 py-3 text-left">Тоглогч</th>
                      <th className="px-3 py-3 text-center">PPG</th>
                      <th className="px-3 py-3 text-center">RPG</th>
                      <th className="px-3 py-3 text-center">APG</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {roster.map((p) => (
                      <tr key={p.id} className="hover:bg-primary/[0.04] transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/player/${p.id}?s=${sid}`} className="flex items-center gap-3 hover:text-primary transition-colors">
                            {p.photo_path ? (
                              <img src={fileUrl(p.photo_path)} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 border-2" style={{ borderColor: ac }} />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-line flex items-center justify-center font-display shrink-0" style={{ color: ac }}>{initials(tc(p.last_name), 1)}</div>
                            )}
                            <div>
                              <div className="font-bold text-sm">{tc(p.last_name)} {tc(p.first_name)}</div>
                              <div className="text-[10px] text-muted flex gap-1.5">
                                {p.jersey_no && <span>#{p.jersey_no}</span>}
                                {p.position && <span className="font-bold" style={{ color: ac }}>{p.position}</span>}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-center font-display text-lg" style={{ color: ac }}>{p.ppg || '—'}</td>
                        <td className="px-3 py-3 text-center text-muted text-xs">{p.rpg || '—'}</td>
                        <td className="px-3 py-3 text-center text-muted text-xs">{p.apg || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-display mb-4">Сүүлийн тоглолтууд</h2>
            <div className="space-y-3">
              {matches.map((m) => {
                const won = (m.side === 'home' && m.home_score > m.away_score) || (m.side === 'away' && m.away_score > m.home_score);
                const my = m.side === 'home' ? m.home_score : m.away_score;
                const op = m.side === 'home' ? m.away_score : m.home_score;
                const oppName = m.side === 'home' ? m.at : m.ht;
                const oppLogo = m.side === 'home' ? m.al : m.hl;
                return (
                  <Link key={m.id} href={`/match/${m.id}`} className="flex items-center gap-3 border border-line rounded-lg px-4 py-3 hover:border-primary transition-colors">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: won ? '#22c55e' : '#ef4444' }}>
                      {won ? 'W' : 'L'}
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {oppLogo && <img src={fileUrl(oppLogo)} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />}
                      <span className="text-sm font-semibold truncate">{oppName}</span>
                    </div>
                    <div className={`font-display text-lg shrink-0 ${won ? 'text-open' : 'text-live'}`}>
                      {my}–{op}
                    </div>
                  </Link>
                );
              })}
              {matches.length === 0 && <div className="text-center py-8 text-muted text-sm">Тоглолт байхгүй</div>}
            </div>
          </div>
        </div>
      </div>
    </LeagueShell>
  );
}
