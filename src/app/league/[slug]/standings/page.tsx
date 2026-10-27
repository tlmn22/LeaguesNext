/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { Metadata } from 'next';
import { getLeagueCtx, getStandings, teamPath } from '@/lib/league';
import { fileUrl, initials, tc } from '@/lib/format';
import LeagueShell from '@/components/league/LeagueShell';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ slug: string }>; searchParams: Promise<{ s?: string }> };

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const ctx = await getLeagueCtx((await params).slug, (await searchParams).s);
  return { title: `Хүснэгт — ${ctx.lg.name}` };
}

export default async function StandingsPage({ params, searchParams }: P) {
  const ctx = await getLeagueCtx((await params).slug, (await searchParams).s);
  const { sid, season, ac, slug } = ctx;
  const { zones, hasZones } = await getStandings(sid);
  const zoneEntries = [...zones.entries()];

  return (
    <LeagueShell ctx={ctx} active="standings">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-4xl uppercase">Хүснэгт</h2>
          <span className="text-sm text-muted">{season?.name}</span>
        </div>

        {zoneEntries.length === 0 && <div className="text-center py-16 text-muted">Баг бүртгэгдээгүй байна</div>}

        {zoneEntries.map(([zone, teams], zi) => (
          <div key={zone}>
            {hasZones && zone !== '' && <h3 className={`font-display text-xl uppercase mb-3 ${zi > 0 ? 'mt-10' : ''}`}>{zone} бүс</h3>}
            <div className="overflow-x-auto mb-8">
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="w-10">#</th>
                    <th>Баг</th>
                    <th className="!text-center">ТТ</th>
                    <th className="!text-center">Ялалт</th>
                    <th className="!text-center">Ялагдал</th>
                    <th className="!text-center hidden sm:table-cell">Явц</th>
                    <th className="!text-center hidden sm:table-cell">+/-</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t, i) => {
                    const p = t.gp ? Math.round((t.wins / t.gp) * 100) : 0;
                    const diff = t.pf - t.pa;
                    return (
                      <tr key={t.stid}>
                        <td><span className="font-display text-lg text-muted">{i + 1}</span></td>
                        <td>
                          <Link href={teamPath(slug, sid, t.stid)} className="flex items-center gap-2.5 hover:text-primary">
                            {t.logo_path ? (
                              <img src={fileUrl(t.logo_path)} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-line grid place-items-center font-display text-xs shrink-0">{initials(tc(t.name))}</div>
                            )}
                            <span className="font-medium truncate">{tc(t.name)}</span>
                          </Link>
                        </td>
                        <td className="text-center text-ink2">{t.gp}</td>
                        <td className="text-center"><span className="font-display text-lg" style={{ color: ac }}>{t.wins}</span></td>
                        <td className="text-center text-ink2 font-medium">{t.losses}</td>
                        <td className="hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${p}%`, background: ac }} />
                            </div>
                            <span className="text-xs text-muted w-8 text-right">{p}%</span>
                          </div>
                        </td>
                        <td className={`text-center font-semibold hidden sm:table-cell ${diff >= 0 ? 'text-open' : 'text-live'}`}>{diff >= 0 ? `+${diff}` : diff}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </LeagueShell>
  );
}
