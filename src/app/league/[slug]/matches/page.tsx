/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { Metadata } from 'next';
import { query } from '@/lib/db';
import { MATCH_ROW_SQL, getLeagueCtx, lgPath, type MatchRow } from '@/lib/league';
import { fileUrl, fmtDate, tc } from '@/lib/format';
import LeagueShell from '@/components/league/LeagueShell';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ slug: string }>; searchParams: Promise<{ s?: string; f?: string }> };

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const ctx = await getLeagueCtx((await params).slug, (await searchParams).s);
  return { title: `Тоглолтууд — ${ctx.lg.name}` };
}

const FILTERS = [
  ['all', 'Бүгд'],
  ['done', 'Дууссан'],
  ['upcoming', 'Хуваарьт'],
] as const;

export default async function LeagueMatches({ params, searchParams }: P) {
  const sp = await searchParams;
  const ctx = await getLeagueCtx((await params).slug, sp.s);
  const { sid, ac, slug } = ctx;
  const f = sp.f === 'done' || sp.f === 'upcoming' ? sp.f : 'all';
  const where = f === 'done' ? " AND m.status='finished'" : f === 'upcoming' ? " AND m.status='scheduled'" : '';
  const order = f === 'upcoming' ? 'ASC' : 'DESC';
  const ms = await query<MatchRow>(`${MATCH_ROW_SQL} WHERE m.season_id=?${where} ORDER BY m.match_datetime ${order}`, [sid]);

  return (
    <LeagueShell ctx={ctx} active="matches">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h2 className="font-display text-4xl uppercase">Тоглолтууд</h2>
          <div className="flex gap-1.5">
            {FILTERS.map(([k, v]) => (
              <Link
                key={k}
                href={lgPath(slug, sid, 'matches', `&f=${k}`)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${f === k ? 'text-white' : 'text-ink2 border border-line2 hover:border-primary hover:text-primary'}`}
                style={f === k ? { background: ac } : undefined}
              >
                {v}
              </Link>
            ))}
          </div>
        </div>

        {ms.length === 0 && (
          <div className="text-center py-20 text-muted">
            <span className="material-icons-round text-5xl block mb-3 text-line2">sports_basketball</span>
            Тоглолт байхгүй байна
          </div>
        )}

        <div className="border-t border-line">
          {ms.map((m) => {
            const fin = m.status === 'finished';
            const hw = fin && m.home_score > m.away_score;
            const aw = fin && m.away_score > m.home_score;
            return (
              <Link key={m.id} href={`/match/${m.id}`} className="grid grid-cols-[54px_1fr_auto_1fr] items-center gap-3 py-3.5 border-b border-line hover:bg-primary/[0.04] transition-colors group">
                <div>
                  <div className="font-display text-lg leading-none">{fmtDate(m.match_datetime, 'H:i')}</div>
                  <div className="text-[9px] text-muted mt-0.5">{fmtDate(m.match_datetime, 'd.m')}</div>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  {m.hl && <img src={fileUrl(m.hl)} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />}
                  <span className={`font-medium text-sm truncate ${hw ? '' : 'text-ink2'}`}>{tc(m.ht)}</span>
                </div>
                {fin ? (
                  <div className="font-display text-xl tracking-widest shrink-0 flex items-center gap-1">
                    <span className={hw ? '' : 'text-muted'}>{m.home_score}</span>
                    <span className="text-line2 text-lg">:</span>
                    <span className={aw ? '' : 'text-muted'}>{m.away_score}</span>
                  </div>
                ) : m.status === 'live' ? (
                  <span className="text-xs font-medium text-live">● Шууд</span>
                ) : (
                  <span className="text-xs font-medium text-muted">VS</span>
                )}
                <div className="flex items-center gap-2 min-w-0 justify-end">
                  <span className={`font-medium text-sm truncate text-right ${aw ? '' : 'text-ink2'}`}>{tc(m.at)}</span>
                  {m.al && <img src={fileUrl(m.al)} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </LeagueShell>
  );
}
