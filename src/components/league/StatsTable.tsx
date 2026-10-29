'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { StatRow } from '@/lib/stats';

type Col = { key: string; label: string; title: string; pct?: boolean; int?: boolean };

const SHOOT: Col[] = [
  { key: 'ppg', label: 'PPG', title: 'Оноо / тоглолт' },
  { key: 'fgm', label: 'FGM', title: 'Онож шидэлт / тоглолт' },
  { key: 'fga', label: 'FGA', title: 'Шидэлт / тоглолт' },
  { key: 'fgp', label: 'FG%', title: 'Шидэлтийн хувь', pct: true },
  { key: 'tpm', label: '3PM', title: '3 оноо оносон / тоглолт' },
  { key: 'tpa', label: '3PA', title: '3 онооны шидэлт / тоглолт' },
  { key: 'tpp', label: '3P%', title: '3 онооны хувь', pct: true },
  { key: 'ftm', label: 'FTM', title: 'Торгуулийн оносон / тоглолт' },
  { key: 'fta', label: 'FTA', title: 'Торгуулийн шидэлт / тоглолт' },
  { key: 'ftp', label: 'FT%', title: 'Торгуулийн хувь', pct: true },
];
const REST: Col[] = [
  { key: 'rpg', label: 'RPG', title: 'Самбар / тоглолт' },
  { key: 'apg', label: 'APG', title: 'Дамжуулалт / тоглолт' },
  { key: 'spg', label: 'SPG', title: 'Таслалт / тоглолт' },
  { key: 'bpg', label: 'BPG', title: 'Хаалт / тоглолт' },
  { key: 'tpg', label: 'TPG', title: 'Алдаа / тоглолт' },
];
const PLAYER_COLS: Col[] = [
  { key: 'gp', label: 'GP', title: 'Тоглосон тоглолт', int: true },
  { key: 'min', label: 'MIN', title: 'Минут / тоглолт' },
  ...SHOOT,
  { key: 'orpg', label: 'ORPG', title: 'Довтолгооны самбар / тоглолт' },
  { key: 'drpg', label: 'DRPG', title: 'Хамгаалалтын самбар / тоглолт' },
  ...REST,
  { key: 'pfpg', label: 'PF', title: 'Хувийн алдаа / тоглолт' },
];
const TEAM_COLS: Col[] = [
  { key: 'gp', label: 'GP', title: 'Тоглолт', int: true },
  { key: 'w', label: 'W', title: 'Ялалт', int: true },
  { key: 'l', label: 'L', title: 'Ялагдал', int: true },
  ...SHOOT,
  ...REST,
];

const PAGE_SIZES = [10, 25, 50];

export default function StatsTable({
  players,
  teams,
  initialView = 'players',
  initialSort = 'ppg',
  ac,
}: {
  players: StatRow[];
  teams: StatRow[];
  initialView?: 'players' | 'teams';
  initialSort?: string;
  ac: string;
}) {
  const [view, setView] = useState(initialView);
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: initialSort, dir: -1 });
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

  const isPlayers = view === 'players';
  const cols = isPlayers ? PLAYER_COLS : TEAM_COLS;
  const data = isPlayers ? players : teams;

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const filtered = s ? data.filter((r) => `${r.name} ${r.sub}`.toLowerCase().includes(s)) : data;
    const get = (r: StatRow) => (sort.key === 'name' ? r.name : r.v[sort.key] ?? null);
    return [...filtered].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      if (x === y) return a.name.localeCompare(b.name);
      if (x === null) return 1; // хоосон утга үргэлж доор
      if (y === null) return -1;
      return (typeof x === 'string' ? x.localeCompare(String(y)) : Number(x) - Number(y)) * sort.dir;
    });
  }, [data, q, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / size));
  const cur = Math.min(page, pages);
  const shown = rows.slice((cur - 1) * size, cur * size);

  const sortBy = (key: string) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === 'name' ? 1 : -1 }));
    setPage(1);
  };
  const switchView = (v: 'players' | 'teams') => {
    setView(v);
    setQ('');
    setPage(1);
    if (!(v === 'players' ? PLAYER_COLS : TEAM_COLS).some((c) => c.key === sort.key) && sort.key !== 'name') setSort({ key: 'ppg', dir: -1 });
  };

  const fmt = (c: Col, v: number | null | undefined) => (v === null || v === undefined ? '-' : c.int || c.pct ? String(v) : v.toFixed(1));

  const Th = ({ k, label, title, className = '' }: { k: string; label: string; title: string; className?: string }) => {
    const active = sort.key === k;
    return (
      <th className={`py-3 px-2.5 font-bold text-[12px] whitespace-nowrap select-none ${className}`} title={title} aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
        <button type="button" onClick={() => sortBy(k)} className={`inline-flex items-center gap-0.5 hover:text-ink ${active ? 'text-ink' : 'text-ink2'}`}>
          {label}
          <span className="material-icons-round text-[14px]" style={{ opacity: active ? 1 : 0.35 }}>
            {active ? (sort.dir === 1 ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
          </span>
        </button>
      </th>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <div className="inline-flex p-1 rounded-full bg-line">
          {(
            [
              ['players', 'Тоглогчид'],
              ['teams', 'Багууд'],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => switchView(v)}
              aria-pressed={view === v}
              className={`px-5 h-9 rounded-full text-sm font-bold transition-colors ${view === v ? 'bg-surface shadow-sm' : 'text-muted hover:text-ink'}`}
              style={view === v ? { color: ac } : undefined}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-muted text-lg">search</span>
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder={isPlayers ? 'Тоглогч, баг хайх' : 'Баг хайх'}
            className="w-full h-10 pl-10 pr-3 rounded-lg border border-line2 bg-surface text-sm focus:outline-none focus:border-primary focus:ring-0"
          />
        </div>
      </div>

      <div className="border border-line rounded-xl bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-line">
                <th className="sticky left-0 z-10 bg-surface py-3 pl-4 pr-2.5 text-left min-w-[220px]">
                  <button type="button" onClick={() => sortBy('name')} className={`inline-flex items-center gap-0.5 font-bold text-[12px] ${sort.key === 'name' ? 'text-ink' : 'text-ink2'}`}>
                    {isPlayers ? 'Тоглогч' : 'Баг'}
                    <span className="material-icons-round text-[14px]" style={{ opacity: sort.key === 'name' ? 1 : 0.35 }}>
                      {sort.key === 'name' ? (sort.dir === 1 ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                    </span>
                  </button>
                </th>
                {isPlayers && <th className="py-3 px-2.5 font-bold text-[12px] text-ink2" title="Байрлал">POS</th>}
                {cols.map((c) => (
                  <Th key={c.key} k={c.key} label={c.label} title={c.title} className="text-center" />
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="group border-b border-line last:border-0">
                  <td className="sticky left-0 z-10 bg-surface group-hover:bg-raise py-2.5 pl-4 pr-2.5 transition-colors">
                    <Link href={r.href} className="flex items-center gap-3 min-w-0 hover:text-primary">
                      <span className={`w-10 h-10 shrink-0 overflow-hidden grid place-items-center bg-line font-display text-sm ${isPlayers ? 'rounded-full' : 'rounded-lg'}`}>
                        {r.photo ? <img src={r.photo} alt="" className={`w-full h-full ${isPlayers ? 'object-cover object-top' : 'object-contain p-0.5'}`} loading="lazy" /> : r.name.slice(0, 1)}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold truncate max-w-[200px]">{r.name}</span>
                        {r.sub && <span className="block text-[11px] text-muted truncate max-w-[200px]">{r.sub}</span>}
                      </span>
                    </Link>
                  </td>
                  {isPlayers && <td className="py-2.5 px-2.5 text-center text-ink2 group-hover:bg-raise">{r.pos || '-'}</td>}
                  {cols.map((c) => (
                    <td
                      key={c.key}
                      className={`py-2.5 px-2.5 text-center tabular-nums whitespace-nowrap group-hover:bg-raise ${sort.key === c.key ? 'font-bold' : 'text-ink2'}`}
                      style={sort.key === c.key ? { color: ac } : undefined}
                    >
                      {fmt(c, r.v[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={cols.length + 2} className="py-14 text-center text-muted">
                    {q ? 'Хайлтад тохирох үр дүн олдсонгүй' : 'Статистик байхгүй байна'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap mt-4 text-sm text-muted">
        <div className="flex items-center gap-2">
          <span>
            {rows.length ? `${(cur - 1) * size + 1}–${Math.min(cur * size, rows.length)}` : 0} / нийт {rows.length}
          </span>
          <select
            value={size}
            onChange={(e) => {
              setSize(Number(e.target.value));
              setPage(1);
            }}
            className="h-8 rounded-md border border-line2 bg-surface text-sm py-0 pl-2 pr-7"
            aria-label="Нэг хуудсанд"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        {pages > 1 && (
          <div className="flex items-center gap-1">
            <button type="button" disabled={cur === 1} onClick={() => setPage(cur - 1)} className="w-8 h-8 grid place-items-center rounded-md border border-line2 disabled:opacity-40" aria-label="Өмнөх">
              <span className="material-icons-round text-lg">chevron_left</span>
            </button>
            <span className="px-2 tabular-nums text-ink">{cur} / {pages}</span>
            <button type="button" disabled={cur === pages} onClick={() => setPage(cur + 1)} className="w-8 h-8 grid place-items-center rounded-md border border-line2 disabled:opacity-40" aria-label="Дараах">
              <span className="material-icons-round text-lg">chevron_right</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
