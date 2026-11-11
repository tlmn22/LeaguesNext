'use client';

import { useState } from 'react';
import { BTN_SOLID, I, INP, LBL } from '@/components/admin/ui';
import { Submit } from '@/components/admin/client';
import { BEST_OF, PLAYOFF_SIZES, bracketOrder, roundNames } from '@/lib/playoff-shared';
import { savePlayoff } from '../playoff-actions';

type Team = { id: number; name: string };

/** Багийн тоо → шат бүрийн best-of → №1..N байранд баг сонгох */
export default function PlayoffSetup({
  seasonId,
  teams,
  initial,
}: {
  seasonId: number;
  teams: Team[];
  initial: { team_count: number; best_of: number[]; seeds: Record<number, number> } | null;
}) {
  const [n, setN] = useState(initial?.team_count ?? (teams.length >= 8 ? 8 : teams.length >= 4 ? 4 : 2));
  const [bestOf, setBestOf] = useState<number[]>(initial?.best_of ?? []);
  const [seeds, setSeeds] = useState<Record<number, number>>(initial?.seeds ?? {});

  const names = roundNames(n);
  const order = bracketOrder(n);
  const used = new Set(Object.entries(seeds).filter(([s, v]) => Number(s) <= n && v).map(([, v]) => v));
  // Финалаас эхлэн тааруулна: багийн тоо өөрчлөгдөхөд финалын тохиргоо хадгалагдана
  const boFor = (r: number) => bestOf[bestOf.length - names.length + r] ?? (r === names.length - 1 ? 5 : 3);
  const setBo = (r: number, v: number) => {
    const next = names.map((_, i) => boFor(i));
    next[r] = v;
    setBestOf(next);
  };

  const seedSelect = (s: number) => (
    <div className="flex items-center gap-2">
      <span className="font-display text-lg w-9 shrink-0 text-right text-muted">№{s}</span>
      <select
        name={`seed_${s}`}
        value={seeds[s] || ''}
        onChange={(e) => setSeeds({ ...seeds, [s]: Number(e.target.value) })}
        className={INP}
      >
        <option value="">— Хоосон —</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id} disabled={used.has(t.id) && seeds[s] !== t.id}>{t.name}</option>
        ))}
      </select>
    </div>
  );

  return (
    <form action={savePlayoff} className="space-y-6">
      <input type="hidden" name="season_id" value={seasonId} />

      <div>
        <label className={LBL}>Хэдэн баг оролцох вэ?</label>
        <div className="flex gap-2 flex-wrap">
          {PLAYOFF_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setN(s)}
              className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${n === s ? 'border-primary bg-primary/15 text-primary-ink' : 'border-line2 text-ink2 hover:border-primary'}`}
            >
              {s} баг
            </button>
          ))}
        </div>
        <input type="hidden" name="team_count" value={n} />
      </div>

      <div>
        <label className={LBL}>Шат бүрийн цуврал (Best of)</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {names.map((name, r) => (
            <div key={name} className="bg-raise rounded-lg p-3">
              <div className="text-sm font-semibold mb-2">{name}</div>
              <select name={`bo_${r}`} value={boFor(r)} onChange={(e) => setBo(r, Number(e.target.value))} className={INP}>
                {BEST_OF.map((b) => (
                  <option key={b} value={b}>{b === 1 ? '1 тоглолт' : `Best of ${b} (${Math.floor(b / 2) + 1} хожил)`}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className={LBL}>Байрлал — {names[0]}ын тулаанууд</label>
        <p className="text-xs text-muted mb-3">
          №1 нь хамгийн өндөр байр. Хоосон үлдээсэн байрын эсрэг талын баг тоглолтгүйгээр дараагийн шатанд шууд гарна.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: n / 2 }, (_, i) => (
            <div key={i} className="border border-line rounded-lg p-3 space-y-2">
              <div className="text-[11px] uppercase tracking-widest text-muted">Тулаан {i + 1}</div>
              {seedSelect(order[2 * i])}
              <div className="text-center text-xs text-muted">vs</div>
              {seedSelect(order[2 * i + 1])}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Submit className={BTN_SOLID}><I n="save" className="text-base" /> Хадгалах</Submit>
      </div>
    </form>
  );
}
