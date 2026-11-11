import Link from 'next/link';
import { getBracket, type PTeam, type Series } from '@/lib/playoff';
import { fmtDate } from '@/lib/format';
import { BTN_GHOST, Empty, I, Thumb } from '@/components/admin/ui';
import { ConfirmButton } from '@/components/admin/client';
import { deletePlayoff } from '../playoff-actions';
import PlayoffSetup from './PlayoffSetup';

function TeamLine({ t, wins, win }: { t: PTeam | null; wins: number; win: boolean }) {
  return (
    <div className={`flex items-center gap-2 py-1 ${t && !win ? 'opacity-80' : ''}`}>
      {t ? (
        <>
          <span className="text-[11px] text-muted w-5 text-right shrink-0">{t.seed}</span>
          <Thumb src={t.logo} icon="groups" className="w-6 h-6 rounded-md shrink-0" />
          <span className={`flex-1 min-w-0 truncate text-sm ${win ? 'font-bold' : ''}`}>{t.name}</span>
          <span className={`font-display text-lg ${win ? 'text-primary' : 'text-muted'}`}>{wins}</span>
        </>
      ) : (
        <span className="text-sm text-muted italic pl-7">Тодорхойгүй</span>
      )}
    </div>
  );
}

function SeriesCard({ s, seasonId }: { s: Series; seasonId: number }) {
  if (s.empty) return null;
  const ready = s.a && s.b;
  const next = s.games.length + 1;
  const canAdd = ready && !s.winner;
  return (
    <div className="border border-line rounded-xl bg-surface p-3">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-muted mb-1">
        <span>{s.bye ? 'Шууд шалгарсан' : s.bestOf === 1 ? '1 тоглолт' : `Best of ${s.bestOf}`}</span>
        {s.winner && !s.bye && <span className="text-open font-semibold normal-case tracking-normal">✓ {s.winner.name}</span>}
      </div>
      <TeamLine t={s.a} wins={s.winsA} win={!!s.winner && s.winner.stid === s.a?.stid} />
      <TeamLine t={s.b} wins={s.winsB} win={!!s.winner && s.winner.stid === s.b?.stid} />
      {s.games.length > 0 && (
        <div className="border-t border-line mt-2 pt-2 space-y-1">
          {s.games.map((g, i) => (
            <Link key={g.id} href={`/admin/matches/${g.id}`} className="flex items-center gap-2 text-xs text-ink2 hover:text-primary">
              <span className="w-14 text-muted">Тоглолт {i + 1}</span>
              <span className="flex-1">{g.match_datetime ? fmtDate(g.match_datetime, 'd.m H:i') : '—'}</span>
              <span className="font-semibold">{g.status === 'finished' ? `${g.home_score}:${g.away_score}` : g.status === 'live' ? 'Шууд' : 'Хуваарьт'}</span>
            </Link>
          ))}
        </div>
      )}
      {canAdd && (
        <Link
          href={`/admin/matches/new?season_id=${seasonId}&home=${s.a!.stid}&away=${s.b!.stid}&stage=playoff&game_no=${next}`}
          className="mt-2 flex items-center justify-center gap-1 rounded-md border border-dashed border-line2 py-1.5 text-xs font-medium text-ink2 hover:border-primary hover:text-primary"
        >
          <I n="add" className="text-sm" /> {next}-р тоглолт нэмэх
        </Link>
      )}
    </div>
  );
}

export default async function PlayoffTab({ seasonId, teams }: { seasonId: number; teams: { id: number; name: string }[] }) {
  const bracket = await getBracket(seasonId);

  if (teams.length < 2) return <Empty icon="account_tree">Плейофф үүсгэхэд дор хаяж 2 баг бүртгэлтэй байх ёстой</Empty>;

  const initial = bracket
    ? {
        team_count: bracket.playoff.team_count,
        best_of: bracket.playoff.best_of,
        seeds: Object.fromEntries(bracket.seeds.map((s) => [s.seed, s.stid])),
      }
    : null;

  return (
    <div className="space-y-6">
      {bracket && (
        <>
          {bracket.champion && (
            <div className="border border-primary/40 rounded-xl bg-primary/10 p-4 flex items-center gap-3">
              <I n="emoji_events" className="text-3xl text-primary" />
              <div>
                <div className="text-[11px] uppercase tracking-widest text-muted">Аварга</div>
                <div className="font-display text-2xl">{bracket.champion.name}</div>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <div className="grid gap-4 min-w-max" style={{ gridTemplateColumns: `repeat(${bracket.rounds.length}, minmax(240px, 1fr))` }}>
              {bracket.rounds.map((r) => (
                <div key={r.name} className="space-y-3">
                  <div className="font-display text-lg uppercase tracking-wide">{r.name}</div>
                  {r.series.map((s) => (
                    <SeriesCard key={s.key} s={s} seasonId={seasonId} />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted">
            Цувралын оноо нь <b>Плейофф</b> шаттай, дууссан тоглолтуудаас автоматаар бодогдоно. Ялагч тодормогц дараагийн шатанд шилжинэ.
          </p>
        </>
      )}

      <details className="border border-line rounded-xl bg-surface" open={!bracket}>
        <summary className="cursor-pointer select-none px-5 py-3.5 font-semibold flex items-center gap-2">
          <I n="tune" className="text-base" /> {bracket ? 'Тохиргоо засах' : 'Плейофф үүсгэх'}
        </summary>
        <div className="px-5 pb-5 pt-1">
          <PlayoffSetup seasonId={seasonId} teams={teams} initial={initial} />
        </div>
      </details>

      {bracket && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link href={`/admin/seasons/${seasonId}?tab=matches`} className={BTN_GHOST}><I n="sports_basketball" className="text-base" /> Бүх тоглолт</Link>
          <form action={deletePlayoff}>
            <input type="hidden" name="season_id" value={seasonId} />
            <ConfirmButton message="Плейоффын тохиргоог устгах уу? Тоглолтууд хэвээр үлдэнэ." className={`${BTN_GHOST} hover:!text-live hover:!border-live`} title="Устгах">
              <I n="delete" className="text-sm" /> Тохиргоо устгах
            </ConfirmButton>
          </form>
        </div>
      )}
    </div>
  );
}
