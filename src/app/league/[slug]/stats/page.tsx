import type { Metadata } from 'next';
import { getLeagueCtx } from '@/lib/league';
import { playerStats, teamStats } from '@/lib/stats';
import LeagueShell from '@/components/league/LeagueShell';
import StatsTable from '@/components/league/StatsTable';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ slug: string }>; searchParams: Promise<{ s?: string; st?: string; view?: string }> };

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
  const [players, teams] = await Promise.all([playerStats(sid), teamStats(sid, slug)]);

  return (
    <LeagueShell ctx={ctx} active="stats">
      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h2 className="font-display text-4xl uppercase">Статистик</h2>
          {season && <p className="text-sm text-muted mt-1">{season.name} · тоглолт тутмын дундаж</p>}
        </div>
        <StatsTable
          players={players}
          teams={teams}
          initialView={sp.view === 'teams' ? 'teams' : 'players'}
          initialSort={ST_SORT[sp.st ?? ''] ?? 'ppg'}
          ac={ac}
        />
      </main>
    </LeagueShell>
  );
}
