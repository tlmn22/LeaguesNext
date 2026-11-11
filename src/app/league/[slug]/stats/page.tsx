import Link from 'next/link';
import type { Metadata } from 'next';
import { getLeagueCtx, lgPath } from '@/lib/league';
import { hasPlayoffGames, type Phase } from '@/lib/playoff';
import { isLightColor } from '@/lib/format';
import { playerStats, teamStats } from '@/lib/stats';
import LeagueShell from '@/components/league/LeagueShell';
import StatsTable from '@/components/league/StatsTable';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ slug: string }>; searchParams: Promise<{ s?: string; st?: string; view?: string; mode?: string; phase?: string }> };

// Хуучин ?st= холбоос (Тойм дээрх "Бүгдийг харах") → эрэмбэлэх багана
const ST_SORT: Record<string, string> = { pts: 'ppg', reb: 'rpg', ast: 'apg', stl: 'spg', blk: 'bpg' };

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const ctx = await getLeagueCtx((await params).slug, (await searchParams).s);
  return { title: `Статистик — ${ctx.lg.name}` };
}

export default async function LeagueStats({ params, searchParams }: P) {
  const sp = await searchParams;
  const ctx = await getLeagueCtx((await params).slug, sp.s);
  const { sid, ac, slug, season } = ctx;
  const showPhase = await hasPlayoffGames(sid);
  const phase: Phase = showPhase && sp.phase === 'playoff' ? 'playoff' : 'regular';
  const [players, allTeams] = await Promise.all([playerStats(sid, phase), teamStats(sid, slug, phase)]);
  // Плейоффт оролцоогүй багуудыг харуулахгүй
  const teams = phase === 'playoff' ? allTeams.filter((t) => Number(t.t.gp) > 0) : allTeams;

  return (
    <LeagueShell ctx={ctx} active="stats">
      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-4xl uppercase">Статистик</h2>
            {season && <p className="text-sm text-muted mt-1">{season.name}</p>}
          </div>
          {showPhase && (
            <div className="inline-flex rounded-lg border border-line2 p-1 bg-surface" role="group" aria-label="Шат">
              {([['regular', 'Энгийн улирал'], ['playoff', 'Плейофф']] as const).map(([k, l]) => (
                <Link
                  key={k}
                  href={lgPath(slug, sid, 'stats', k === 'playoff' ? '&phase=playoff' : '')}
                  aria-current={phase === k ? 'true' : undefined}
                  className={`px-3.5 py-1.5 rounded-md text-sm font-semibold transition-colors ${phase === k ? '' : 'text-muted hover:text-ink'}`}
                  style={phase === k ? { background: ac, color: isLightColor(ac) ? '#1b1c24' : '#fff' } : undefined}
                >
                  {l}
                </Link>
              ))}
            </div>
          )}
        </div>
        <StatsTable
          key={phase}
          players={players}
          teams={teams}
          initialView={sp.view === 'teams' ? 'teams' : 'players'}
          initialSort={ST_SORT[sp.st ?? ''] ?? 'ppg'}
          initialMode={sp.mode === 'total' ? 'total' : 'avg'}
          ac={ac}
        />
      </main>
    </LeagueShell>
  );
}
