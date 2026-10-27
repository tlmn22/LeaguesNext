/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { Metadata } from 'next';
import { STAT_COLS, getLeaders, getLeagueCtx, lgPath, type StatKey } from '@/lib/league';
import { fileUrl, initials, tc } from '@/lib/format';
import LeagueShell from '@/components/league/LeagueShell';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ slug: string }>; searchParams: Promise<{ s?: string; st?: string }> };

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const ctx = await getLeagueCtx((await params).slug, (await searchParams).s);
  return { title: `Статистик — ${ctx.lg.name}` };
}

export default async function LeagueStats({ params, searchParams }: P) {
  const sp = await searchParams;
  const ctx = await getLeagueCtx((await params).slug, sp.s);
  const { sid, ac, slug } = ctx;
  const tab: StatKey = sp.st && sp.st in STAT_COLS ? (sp.st as StatKey) : 'pts';
  const sc = STAT_COLS[tab];
  const top = await getLeaders(sid, tab, 20);

  return (
    <LeagueShell ctx={ctx} active="stats">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h2 className="text-4xl font-display">Статистик</h2>
          <div className="flex gap-1.5 bg-line p-1 rounded-xl overflow-x-auto">
            {(Object.keys(STAT_COLS) as StatKey[]).map((k) => (
              <Link
                key={k}
                href={lgPath(slug, sid, 'stats', `&st=${k}`)}
                className={`px-3 py-2 rounded-lg text-xs font-bold uppercase whitespace-nowrap transition-all ${tab === k ? 'text-white' : 'text-ink2 hover:text-primary'}`}
                style={{ background: tab === k ? ac : 'transparent' }}
              >
                {STAT_COLS[k][0]}
              </Link>
            ))}
          </div>
        </div>

        <div className="border border-line rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white text-xs font-bold uppercase" style={{ background: ac }}>
                  <th className="px-4 py-3 text-left w-8">#</th>
                  <th className="px-4 py-3 text-left">Тоглогч</th>
                  <th className="px-3 py-3 text-center">ТТ</th>
                  <th className="px-3 py-3 text-center">{sc[0]}</th>
                  <th className="px-3 py-3 text-center hidden sm:table-cell">Нийт</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {top.map((p, i) => (
                  <tr key={p.pid} className="hover:bg-primary/[0.04] transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-display text-xl" style={{ color: ac }}>{i + 1}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/player/${p.pid}?s=${sid}`} className="flex items-center gap-2.5 hover:underline">
                        {p.photo_path ? (
                          <img src={fileUrl(p.photo_path)} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-line flex items-center justify-center font-display shrink-0" style={{ color: ac }}>{initials(tc(p.last_name), 1)}</div>
                        )}
                        <div>
                          <div className="font-bold text-ink">{tc(p.last_name)} {tc(p.first_name)}</div>
                          <div className="text-[10px] text-muted uppercase">{tc(p.team_name)}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-center text-muted">{p.gp}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="font-display text-xl" style={{ color: ac }}>{p.val}</span>
                    </td>
                    <td className="px-3 py-3 text-center text-muted font-semibold hidden sm:table-cell">{p.total}</td>
                  </tr>
                ))}
                {top.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted">Статистик байхгүй байна</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </LeagueShell>
  );
}
