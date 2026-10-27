/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { Metadata } from 'next';
import { query } from '@/lib/db';
import { getLeagueCtx, teamPath } from '@/lib/league';
import { fileUrl, initials, tc } from '@/lib/format';
import LeagueShell from '@/components/league/LeagueShell';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ slug: string }>; searchParams: Promise<{ s?: string }> };

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const ctx = await getLeagueCtx((await params).slug, (await searchParams).s);
  return { title: `Багууд — ${ctx.lg.name}` };
}

export default async function LeagueTeams({ params, searchParams }: P) {
  const ctx = await getLeagueCtx((await params).slug, (await searchParams).s);
  const { sid, ac, slug } = ctx;
  const teams = await query<{ stid: number; name: string; logo_path: string | null; player_cnt: number }>(
    `SELECT st.id AS stid, t.name, t.logo_path, COUNT(DISTINCT tsr.player_id) AS player_cnt
     FROM season_teams st JOIN teams t ON t.id=st.team_id
     LEFT JOIN team_season_roster tsr ON tsr.season_team_id=st.id AND tsr.status='active'
     WHERE st.season_id=? GROUP BY st.id, t.name, t.logo_path ORDER BY t.name`,
    [sid],
  );

  return (
    <LeagueShell ctx={ctx} active="teams">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <h2 className="text-4xl font-display mb-6">
          Багууд <span className="text-line2 text-3xl">{teams.length}</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {teams.map((t) => (
            <Link key={t.stid} href={teamPath(slug, sid, t.stid)} className="block border border-line rounded-lg overflow-hidden text-center hover:border-primary transition-colors group">
              <div className="h-[3px]" style={{ background: ac }} />
              <div className="p-4">
                <div className="w-16 h-16 mx-auto mb-3 rounded-xl overflow-hidden bg-line flex items-center justify-center p-1.5">
                  {t.logo_path ? (
                    <img src={fileUrl(t.logo_path)} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span className="font-display text-2xl" style={{ color: ac }}>{initials(tc(t.name))}</span>
                  )}
                </div>
                <div className="font-display text-lg tracking-wide group-hover:text-primary transition-colors leading-tight">{tc(t.name)}</div>
                <div className="text-xs text-muted mt-1">{t.player_cnt} тоглогч</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </LeagueShell>
  );
}
