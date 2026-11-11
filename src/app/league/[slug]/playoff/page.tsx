import Link from 'next/link';
import type { Metadata } from 'next';
import { getLeagueCtx } from '@/lib/league';
import { getBracket, type PTeam, type Series } from '@/lib/playoff';
import { fmtDate, tc } from '@/lib/format';
import LeagueShell from '@/components/league/LeagueShell';
import PlayoffBracket from '@/components/league/PlayoffBracket';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ slug: string }>; searchParams: Promise<{ s?: string }> };

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const ctx = await getLeagueCtx((await params).slug, (await searchParams).s);
  return { title: `Плейофф — ${ctx.lg.name}` };
}

const nameOf = (s: Series, stid: number) => tc(((s.a?.stid === stid ? s.a : s.b) as PTeam).name);

/** Цуврал бүрийн тоглолтууд — сүлжээн дэх карт дээр дарахад энд ирнэ */
function SeriesGames({ s, roundName, ac }: { s: Series; roundName: string; ac: string }) {
  const a = s.a!;
  const b = s.b!;
  return (
    <section id={s.key} className="po-series p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="text-[11px] font-bold uppercase tracking-widest text-muted">{roundName}</div>
        <div className="text-xs text-muted">{s.bestOf === 1 ? '1 тоглолт' : `Best of ${s.bestOf}`}</div>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <span className={`flex-1 text-right font-semibold truncate ${s.winner?.stid === a.stid ? '' : s.winner ? 'opacity-50' : ''}`}>{tc(a.name)}</span>
        <span className="font-display text-2xl shrink-0" style={{ color: ac }}>{s.winsA}–{s.winsB}</span>
        <span className={`flex-1 font-semibold truncate ${s.winner?.stid === b.stid ? '' : s.winner ? 'opacity-50' : ''}`}>{tc(b.name)}</span>
      </div>
      <div className="divide-y divide-line border-t border-line">
        {s.games.map((g, i) => {
          const done = g.status === 'finished';
          const homeWin = done && g.home_score > g.away_score;
          return (
            <Link key={g.id} href={`/match/${g.id}`} className="grid grid-cols-[64px_1fr_auto_1fr] items-center gap-2 py-2.5 text-sm hover:bg-raise/60 rounded">
              <span className="text-xs text-muted">
                <b className="block text-ink2">Тоглолт {i + 1}</b>
                {g.match_datetime ? fmtDate(g.match_datetime, 'm.d') : ''}
              </span>
              <span className={`text-right truncate ${done && !homeWin ? 'text-muted' : 'font-semibold'}`}>{nameOf(s, g.home_stid)}</span>
              <span className="font-display text-base text-center min-w-16">
                {done ? `${g.home_score} : ${g.away_score}` : g.status === 'live' ? <span className="text-live">Шууд</span> : g.match_datetime ? fmtDate(g.match_datetime, 'H:i') : 'vs'}
              </span>
              <span className={`truncate ${done && homeWin ? 'text-muted' : 'font-semibold'}`}>{nameOf(s, g.away_stid)}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default async function PlayoffPage({ params, searchParams }: P) {
  const ctx = await getLeagueCtx((await params).slug, (await searchParams).s);
  const { sid, season, ac } = ctx;
  const bracket = await getBracket(sid);
  // Финалаас эхлэн харуулна — хамгийн сонирхолтой нь дээрээ
  const withGames = bracket ? [...bracket.rounds].reverse().flatMap((r) => r.series.filter((s) => s.a && s.b && s.games.length).map((s) => ({ s, r }))) : [];

  return (
    <LeagueShell ctx={ctx} active="playoff">
      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-4xl uppercase">Плейофф</h2>
            {season && <p className="text-sm text-muted mt-1">{season.name}</p>}
          </div>
        </div>

        {!bracket ? (
          <div className="text-center py-16 text-muted">Энэ улиралд плейофф зохион байгуулагдаагүй байна</div>
        ) : (
          <>
            <PlayoffBracket bracket={bracket} ac={ac} />
            {withGames.length > 0 && (
              <div className="mt-10">
                <h3 className="font-display text-2xl uppercase mb-4">Цувралууд</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {withGames.map(({ s, r }) => (
                    <SeriesGames key={s.key} s={s} roundName={r.name} ac={ac} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </LeagueShell>
  );
}
