/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { Metadata } from 'next';
import { query } from '@/lib/db';
import { MATCH_ROW_SQL, getLeaders, getLeagueCtx, getStandings, lgPath, teamPath, type MatchRow, type StatKey } from '@/lib/league';
import { fileUrl, fmtDate, initials, tc } from '@/lib/format';
import { seasonNews, toCard } from '@/lib/news';
import LeagueShell from '@/components/league/LeagueShell';
import LeaderCards, { type LeaderCard } from '@/components/league/LeaderCards';
import { NewsCard, NewsFeatured, NewsList } from '@/components/public/lmn';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ slug: string }>; searchParams: Promise<{ s?: string }> };

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const ctx = await getLeagueCtx((await params).slug, (await searchParams).s);
  return { title: `${ctx.lg.name}${ctx.season ? ' — ' + ctx.season.name : ''}`, description: ctx.lg.description ?? undefined };
}

// Тойм дээрх тэргүүлэгчдийн ангилал: [түлхүүр, нэр, нэгж]
const LEADER_CATS: [StatKey, string, string][] = [
  ['pts', 'Оноо', 'PPG'],
  ['ast', 'Дамжуулалт', 'APG'],
  ['reb', 'Самбар', 'RPG'],
  ['blk', 'Хаалт', 'BPG'],
];

export default async function LeagueHome({ params, searchParams }: P) {
  const ctx = await getLeagueCtx((await params).slug, (await searchParams).s);
  const { seasons, sid, ac, slug } = ctx;

  const [recent, { zones, hasZones }, leaders, news] = await Promise.all([
    query<MatchRow>(`${MATCH_ROW_SQL} WHERE m.season_id=? AND m.status='finished' ORDER BY m.match_datetime DESC LIMIT 5`, [sid]),
    getStandings(sid),
    Promise.all(LEADER_CATS.map(([key]) => getLeaders(sid, key, 5))),
    seasonNews(sid, 6).then((r) => r.map(toCard)),
  ]);

  const leaderCards: LeaderCard[] = LEADER_CATS.map(([key, label, unit], i) => ({
    key, label, unit, href: lgPath(slug, sid, 'stats', `&st=${key}`), rows: leaders[i],
  })).filter((c) => c.rows.length > 0);

  return (
    <LeagueShell ctx={ctx} active="home">
      <main className="max-w-7xl mx-auto px-4 py-10">
        {leaderCards.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-[13px] uppercase tracking-[0.14em] text-muted">Тэргүүлэгчид</h3>
              <Link href={lgPath(slug, sid, 'stats')} className="text-[13px] font-medium hover:opacity-80" style={{ color: ac }}>Бүгд →</Link>
            </div>
            <LeaderCards cards={leaderCards} sid={sid} ac={ac} />
          </section>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8">
            {news.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-[13px] uppercase tracking-[0.14em] text-muted">Мэдээ</h3>
                  <Link href={lgPath(slug, sid, 'news')} className="text-[13px] font-medium hover:opacity-80" style={{ color: ac }}>Бүгд →</Link>
                </div>
                <div className="lmn-stack">
                  <NewsFeatured n={news[0]} />
                  {news.length > 1 && (
                    <div className="lmn-pair">
                      {news.slice(1, 3).map((n) => <NewsCard key={n.href} n={n} />)}
                    </div>
                  )}
                  {news.length > 3 && <NewsList items={news.slice(3)} linkLabel={false} />}
                </div>
              </section>
            )}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-[13px] uppercase tracking-[0.14em] text-muted">Сүүлийн тоглолтууд</h3>
              <Link href={lgPath(slug, sid, 'matches')} className="text-[13px] font-medium hover:opacity-80" style={{ color: ac }}>Бүгд →</Link>
            </div>
            {recent.length === 0 ? (
              <div className="text-center py-16 text-muted border border-line rounded-lg">
                <span className="material-icons-round text-4xl block mb-3 text-line2">sports_basketball</span>
                Тоглолт байхгүй байна
              </div>
            ) : (
              <div className="border-t border-line">
                {recent.map((m) => {
                  const hw = m.home_score > m.away_score;
                  const aw = m.away_score > m.home_score;
                  return (
                    <Link
                      key={m.id}
                      href={`/match/${m.id}`}
                      className="grid grid-cols-[64px_1fr_80px_1fr] sm:grid-cols-[92px_1fr_96px_1fr] items-center gap-2 sm:gap-3.5 py-3.5 border-b border-line hover:bg-primary/[0.04] transition-colors"
                    >
                      <span className="text-xs text-muted">{fmtDate(m.match_datetime, 'Y.m.d')}</span>
                      <span className="flex items-center gap-2.5 justify-end min-w-0">
                        <span className={`font-medium text-sm truncate text-right ${hw ? '' : 'text-ink2'}`}>{tc(m.ht)}</span>
                        <span className="w-8 h-8 rounded-lg bg-line grid place-items-center text-xs font-medium shrink-0 overflow-hidden">
                          {m.hl ? <img src={fileUrl(m.hl)} alt="" className="w-full h-full object-cover" /> : initials(m.ht)}
                        </span>
                      </span>
                      <span className="text-center font-display text-xl tabular-nums">
                        <span className={hw ? '' : 'text-muted'}>{m.home_score}</span>
                        <span className="text-line2 mx-0.5">:</span>
                        <span className={aw ? '' : 'text-muted'}>{m.away_score}</span>
                      </span>
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-line grid place-items-center text-xs font-medium shrink-0 overflow-hidden">
                          {m.al ? <img src={fileUrl(m.al)} alt="" className="w-full h-full object-cover" /> : initials(m.at)}
                        </span>
                        <span className={`font-medium text-sm truncate ${aw ? '' : 'text-ink2'}`}>{tc(m.at)}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-9">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-[13px] uppercase tracking-[0.14em] text-muted">Хүснэгт</h3>
                <Link href={lgPath(slug, sid, 'standings')} className="text-[12px] font-medium hover:opacity-80" style={{ color: ac }}>Бүгд →</Link>
              </div>
              {[...zones.entries()].map(([zname, teams]) => (
                <div key={zname}>
                  {hasZones && zname !== '' && <div className="text-[11px] font-medium uppercase tracking-widest text-muted mb-1.5 mt-3">{zname} бүс</div>}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted text-[10px] font-medium uppercase">
                        <th className="py-1.5 text-left">Баг</th>
                        <th className="py-1.5 text-center w-8">W</th>
                        <th className="py-1.5 text-center w-8">L</th>
                        <th className="py-1.5 text-center w-10">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((t, i) => (
                        <tr key={t.stid} className="border-t border-line">
                          <td className="py-2.5">
                            <Link href={teamPath(slug, sid, t.stid)} className="flex items-center gap-2 hover:text-primary">
                              <span className="font-display text-base w-4 shrink-0 text-muted">{i + 1}</span>
                              {t.logo_path && <img src={fileUrl(t.logo_path)} alt="" className="w-5 h-5 rounded object-cover shrink-0" />}
                              <span className="font-medium text-sm truncate">{tc(t.name)}</span>
                            </Link>
                          </td>
                          <td className="py-2.5 text-center font-medium text-sm">{t.wins}</td>
                          <td className="py-2.5 text-center text-xs text-muted">{t.losses}</td>
                          <td className="py-2.5 text-center text-xs text-muted">{t.gp ? Math.round((t.wins / t.gp) * 100) : 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            {seasons.length > 1 && (
              <div>
                <h3 className="font-medium text-[13px] uppercase tracking-[0.14em] text-muted mb-3">Улирлууд</h3>
                <div>
                  {seasons.map((s) => {
                    const badge =
                      s.status === 'active' ? ['Явагдаж байна', 'var(--lm-open)'] : s.status === 'registration' ? ['Бүртгэл', 'var(--lm-reg)'] : ['Дууссан', 'var(--lm-done)'];
                    return (
                      <Link key={s.id} href={lgPath(slug, s.id)} className="flex items-center justify-between py-2.5 border-t border-line hover:bg-primary/[0.04] transition-colors">
                        <div>
                          <div className="font-medium text-sm" style={s.id === sid ? { color: ac } : undefined}>{s.name}</div>
                          {s.start_date && <div className="text-[11px] text-muted">{fmtDate(s.start_date, 'Y.m.d')}</div>}
                        </div>
                        <span className="text-[11px] font-medium" style={{ color: badge[1] }}>{badge[0]}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </LeagueShell>
  );
}
