/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { STAGES, fileUrl, fmtDate } from '@/lib/format';
import { ICON_BTN, ICON_BTN_DANGER, I, Pill, TH, TD, TR } from './ui';
import { ConfirmButton } from './client';
import { deleteMatch } from '@/app/admin/matches/actions';

export type MatchListRow = {
  id: number; stage: string | null; match_datetime: string; arena_name: string | null; status: string;
  home_score: number; away_score: number; home_team: string; home_logo: string | null; away_team: string; away_logo: string | null;
  stat_count: number; season_name?: string; league_name?: string;
};

export default function MatchTable({ matches, back, showSeason }: { matches: MatchListRow[]; back: string; showSeason?: boolean }) {
  return (
    <div className="overflow-x-auto border border-line rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted text-[11px] uppercase tracking-wide border-b border-line">
            <th className={`${TH} px-4`}>Тоглолт</th>
            {showSeason && <th className={TH}>Улирал</th>}
            <th className={TH}>Шат</th>
            <th className={TH}>Огноо</th>
            <th className={TH}>Заал</th>
            <th className={`${TH} !text-center`}>Дүн</th>
            <th className={`${TH} !text-center`}>Stat</th>
            <th className={TH}>Төлөв</th>
            <th className="w-32 py-2.5 px-4" />
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => (
            <tr key={m.id} className={TR}>
              <td className={`${TD} px-4`}>
                <div className="flex items-center gap-2 min-w-[260px]">
                  <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1">
                    <span className="font-medium truncate text-right">{m.home_team}</span>
                    {m.home_logo && <img src={fileUrl(m.home_logo)} alt="" className="w-5 h-5 rounded object-cover shrink-0" />}
                  </div>
                  <span className="text-muted text-[11px] shrink-0">vs</span>
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {m.away_logo && <img src={fileUrl(m.away_logo)} alt="" className="w-5 h-5 rounded object-cover shrink-0" />}
                    <span className="font-medium truncate">{m.away_team}</span>
                  </div>
                </div>
              </td>
              {showSeason && (
                <td className={`${TD} text-ink2 whitespace-nowrap`}>
                  <div>{m.season_name}</div>
                  <div className="text-[11px] text-muted">{m.league_name}</div>
                </td>
              )}
              <td className={`${TD} text-ink2`}>{STAGES[m.stage ?? ''] ?? m.stage ?? '—'}</td>
              <td className={`${TD} text-ink2 whitespace-nowrap`}>{fmtDate(m.match_datetime, 'd.m.Y H:i')}</td>
              <td className={`${TD} text-muted whitespace-nowrap max-w-[160px] truncate`}>{m.arena_name || '—'}</td>
              <td className={`${TD} text-center whitespace-nowrap`}>
                {m.status === 'finished' ? <span className="font-display text-base">{m.home_score} — {m.away_score}</span> : <span className="text-muted">—</span>}
              </td>
              <td className={`${TD} text-center`}>
                {m.stat_count > 0 ? <span className="text-[11px] font-medium px-2 py-0.5 rounded text-done bg-done/10">{m.stat_count}</span> : <span className="text-muted text-xs">—</span>}
              </td>
              <td className={TD}><Pill status={m.status} /></td>
              <td className="py-2.5 px-4">
                <div className="flex items-center gap-1.5 justify-end">
                  <Link href={`/admin/matches/${m.id}/score`} className={ICON_BTN} title="Дүн / Boxscore"><I n="scoreboard" className="text-sm" /></Link>
                  <Link href={`/admin/matches/${m.id}`} className={ICON_BTN} title="Засах"><I n="edit" className="text-sm" /></Link>
                  <form action={deleteMatch}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="back" value={back} />
                    <ConfirmButton message={`${m.home_team} vs ${m.away_team} тоглолтыг устгах уу?`} className={ICON_BTN_DANGER} title="Устгах">
                      <I n="delete" className="text-sm" />
                    </ConfirmButton>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
