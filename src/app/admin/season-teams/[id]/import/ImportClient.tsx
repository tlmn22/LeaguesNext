'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { importRoster, previewRoster, type ImportRow } from './actions';

const BADGE: Record<ImportRow['status'], [string, string]> = {
  new: ['bg-open/10 text-open', 'Шинэ тоглогч'],
  add: ['bg-reg/10 text-reg', 'Roster-т нэмэгдэнэ'],
  exists: ['bg-amber-400/10 text-amber-400', 'Шинэчлэгдэнэ'],
  conflict: ['bg-live/10 text-live', 'Өөр багт байна — алгасна'],
};

export default function ImportClient({ stid, back }: { stid: number; back: string }) {
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();

  const count = (s: ImportRow['status']) => rows?.filter((r) => r.status === s).length ?? 0;

  return (
    <div className="space-y-5">
      <div className="border border-line rounded-lg p-5">
        <div className="text-sm text-ink2 mb-4 space-y-1">
          <p className="font-medium text-ink">Заавар</p>
          <ol className="list-decimal pl-5 text-muted space-y-0.5">
            <li>
              Template татах:{' '}
              <a href={`/admin/season-teams/${stid}/template`} className="text-primary-ink hover:text-primary">
                roster.xlsx
              </a>
            </li>
            <li>Овог, Нэр, Дугаар, Байр баганыг бөглөнө (байр: PG, SG, SF, PF, C)</li>
            <li>Файлаа сонгоод &quot;Урьдчилан харах&quot; дарна</li>
          </ol>
        </div>
        <form
          action={(fd) =>
            start(async () => {
              setError('');
              const r = await previewRoster(stid, fd);
              if (r.ok) setRows(r.rows);
              else {
                setRows(null);
                setError(r.error);
              }
            })
          }
          className="flex flex-wrap items-center gap-3"
        >
          <input
            type="file"
            name="file"
            accept=".xlsx,.csv"
            required
            className="text-sm text-ink2 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-line2 file:bg-surface file:text-ink2 file:text-xs file:cursor-pointer"
          />
          <button type="submit" disabled={pending} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-primary text-primary-ink hover:bg-primary/10 disabled:opacity-50">
            <span className="material-icons-round text-base">preview</span> {pending && !rows ? 'Уншиж байна...' : 'Урьдчилан харах'}
          </button>
        </form>
        {error && <div className="mt-4 px-4 py-3 rounded-lg text-sm bg-live/10 text-live border border-live/30">{error}</div>}
      </div>

      {rows && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {([['new', 'Шинэ тоглогч', '#3fb173'], ['add', 'Roster-т нэмэх', '#5b9bdd'], ['exists', 'Шинэчлэгдэх', '#f39c12'], ['conflict', 'Алгасах', '#ef5f52']] as const).map(([k, l, c]) => (
              <div key={k} className="border border-line rounded-lg p-3 text-center">
                <div className="font-display text-3xl" style={{ color: c }}>{count(k)}</div>
                <div className="text-xs text-muted">{l}</div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto border border-line rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted text-[11px] uppercase tracking-wide border-b border-line">
                  <th className="text-left font-medium py-2.5 px-4 w-10">#</th>
                  <th className="text-left font-medium py-2.5 px-3">Овог Нэр</th>
                  <th className="text-center font-medium py-2.5 px-3">Дугаар</th>
                  <th className="text-center font-medium py-2.5 px-3">Байр</th>
                  <th className="text-left font-medium py-2.5 px-3">Төлөв</th>
                  <th className="text-left font-medium py-2.5 px-3">Тэмдэглэл</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td className="py-2.5 px-4 text-muted">{i + 1}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold">{r.last}</span> <span className="text-muted">{r.first}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-display text-base">{r.jersey ?? '—'}</td>
                    <td className="py-2.5 px-3 text-center">{r.pos ?? '—'}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${BADGE[r.status][0]}`}>
                        {BADGE[r.status][1]}
                        {r.conflictTeam ? ` (${r.conflictTeam})` : ''}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-muted">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap border border-line rounded-lg p-4">
            <div className="text-sm">
              <b>{count('new') + count('add')}</b> тоглогч нэмэгдэх · <b>{count('exists')}</b> шинэчлэгдэх
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRows(null)} className="px-4 py-2 rounded-lg text-sm font-medium border border-line2 text-ink2 hover:border-primary">
                Цуцлах
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    if (!window.confirm(`${count('new') + count('add')} тоглогч нэмэх, ${count('exists')} шинэчлэх. Үргэлжлүүлэх үү?`)) return;
                    const r = await importRoster(stid, rows);
                    if (r.ok) router.push(back);
                    else setError(r.message);
                  })
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-open text-white hover:opacity-90 disabled:opacity-50"
              >
                <span className="material-icons-round text-base">check</span> {pending ? 'Импорт хийж байна...' : `Импорт хийх (${rows.length})`}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
