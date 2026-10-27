/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { Metadata } from 'next';
import { query } from '@/lib/db';
import { getLeagueCtx } from '@/lib/league';
import { fileUrl, initials, tc } from '@/lib/format';
import LeagueShell from '@/components/league/LeagueShell';
import { NavSelect } from '@/components/public/NavSelect';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ slug: string }>; searchParams: Promise<{ s?: string; team?: string }> };

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const ctx = await getLeagueCtx((await params).slug, (await searchParams).s);
  return { title: `Тоглогчид — ${ctx.lg.name}` };
}

export default async function LeaguePlayers({ params, searchParams }: P) {
  const sp = await searchParams;
  const ctx = await getLeagueCtx((await params).slug, sp.s);
  const { sid, ac, slug } = ctx;
  const teamFilter = parseInt(sp.team ?? '', 10) || 0;

  const [players, allTeams] = await Promise.all([
    query<{ id: number; first_name: string; last_name: string; photo_path: string | null; jersey_no: string | null; position: string | null; team_name: string }>(
      `SELECT p.id, p.first_name, p.last_name, p.photo_path, tsr.jersey_no, tsr.position, t.name AS team_name
       FROM team_season_roster tsr
       JOIN players p ON p.id=tsr.player_id
       JOIN season_teams st ON st.id=tsr.season_team_id
       JOIN teams t ON t.id=st.team_id
       WHERE st.season_id=? AND tsr.status='active' ${teamFilter ? 'AND st.id=?' : ''}
       ORDER BY t.name, CASE WHEN tsr.jersey_no ~ '^[0-9]+$' THEN tsr.jersey_no::integer ELSE 0 END`,
      teamFilter ? [sid, teamFilter] : [sid],
    ),
    query<{ id: number; name: string }>(
      'SELECT st.id, t.name FROM season_teams st JOIN teams t ON t.id=st.team_id WHERE st.season_id=? ORDER BY t.name',
      [sid],
    ),
  ]);

  return (
    <LeagueShell ctx={ctx} active="players">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <h2 className="text-4xl font-display">
            Тоглогчид <span className="text-line2 text-3xl">{players.length}</span>
          </h2>
          <NavSelect
            value={teamFilter}
            hrefTemplate={`/league/${encodeURIComponent(slug)}/players?s=${sid}&team={v}`}
            className="text-sm border border-line2 rounded-lg px-3 py-2.5 pr-8 bg-surface text-ink2 cursor-pointer"
          >
            <option value="0">— Бүх баг —</option>
            {allTeams.map((t) => (
              <option key={t.id} value={t.id}>{tc(t.name)}</option>
            ))}
          </NavSelect>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {players.map((p) => (
            <Link key={p.id + '-' + p.team_name} href={`/player/${p.id}?s=${sid}`} className="border border-line rounded-lg p-4 text-center hover:border-primary transition-colors group block">
              {p.photo_path ? (
                <img src={fileUrl(p.photo_path)} alt="" loading="lazy" className="w-16 h-16 rounded-full object-cover mx-auto mb-3 border-2 transition-all" style={{ borderColor: ac }} />
              ) : (
                <div className="w-16 h-16 rounded-full bg-line mx-auto mb-3 flex items-center justify-center font-display text-2xl border-2" style={{ borderColor: ac + '22', color: ac }}>
                  {initials(tc(p.last_name), 1)}
                </div>
              )}
              <div className="font-bold text-sm leading-tight truncate">{tc(p.last_name)}</div>
              <div className="text-xs text-muted truncate">{tc(p.first_name)}</div>
              <div className="flex justify-center gap-1 mt-2 flex-wrap">
                {p.jersey_no && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-line">#{p.jersey_no}</span>}
                {p.position && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: ac }}>{p.position}</span>}
              </div>
              <div className="text-[10px] text-muted mt-1.5 truncate">{tc(p.team_name)}</div>
            </Link>
          ))}
        </div>
      </div>
    </LeagueShell>
  );
}
