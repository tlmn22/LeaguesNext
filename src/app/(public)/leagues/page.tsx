import Link from 'next/link';
import type { Metadata } from 'next';
import { query } from '@/lib/db';
import { LeagueCard, type LeagueCardRow } from '@/components/public/LeagueCard';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Лигүүд' };

const TABS = [
  ['all', 'Бүгд'],
  ['active', 'Явагдаж байна'],
  ['finished', 'Дууссан'],
] as const;

export default async function LeaguesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = 'all' } = await searchParams;
  const filter = ['active', 'registration', 'finished'].includes(status) ? status : 'all';

  const all = await query<LeagueCardRow>(`
    SELECT l.id, l.name, l.slug, l.logo, l.primary_color, l.tier,
           s.id AS sid, s.name AS sname, s.status AS sstatus, s.start_date, s.end_date,
           COUNT(DISTINCT st.id) AS team_cnt,
           COUNT(DISTINCT m.id) AS match_cnt,
           COUNT(DISTINCT CASE WHEN m.status='finished' THEN m.id END) AS done_cnt
    FROM leagues l
    JOIN seasons s ON s.league_id = l.id
    LEFT JOIN season_teams st ON st.season_id = s.id
    LEFT JOIN matches m ON m.season_id = s.id
    GROUP BY l.id, s.id
    ORDER BY CASE s.status WHEN 'active' THEN 1 WHEN 'registration' THEN 2 WHEN 'finished' THEN 3 ELSE 0 END, l.tier ASC, l.name ASC`);

  // Тоолуур нь шүүлтээс үл хамаарч бүх лигээр тоологдоно
  const counts: Record<string, number> = { all: all.length, active: 0, registration: 0, finished: 0 };
  for (const lg of all) counts[lg.sstatus] = (counts[lg.sstatus] ?? 0) + 1;
  const leagues = filter === 'all' ? all : all.filter((l) => l.sstatus === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <p className="font-medium text-[11px] tracking-[0.16em] uppercase text-primary-ink mb-3">Платформ</p>
      <h1 className="font-display text-5xl uppercase mb-8">Бүх лигүүд</h1>

      <div className="flex flex-wrap gap-1.5 mb-8 border-b border-line pb-6">
        {TABS.map(([key, label]) => {
          const active = filter === key;
          return (
            <Link
              key={key}
              href={`/leagues?status=${key}`}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-primary text-white' : 'text-ink2 border border-line2 hover:border-primary hover:text-primary'
              }`}
            >
              {label}
              <span className={`text-[11px] ${active ? 'opacity-80' : 'text-muted'}`}>{counts[key]}</span>
            </Link>
          );
        })}
      </div>

      {leagues.length === 0 ? (
        <div className="text-center py-20 text-muted text-sm">Лиг олдсонгүй</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {leagues.map((lg) => (
            <LeagueCard key={`${lg.id}-${lg.sid}`} lg={lg} />
          ))}
        </div>
      )}
    </div>
  );
}
