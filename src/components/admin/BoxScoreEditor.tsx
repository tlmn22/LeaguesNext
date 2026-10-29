'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fileUrl, fmtDate } from '@/lib/format';
import {
  PERIODS, PLAYER_FIELDS, TEAM_STAT_FIELDS,
  type Period, type PlayerField, type RosterPlayer, type SaveResult, type ScorePayload, type TeamStatField,
} from '@/lib/score-types';

type Side = 'home' | 'away';
type Line = { dnp: boolean; v: Record<PlayerField, string> };

export type EditorMatch = {
  id: number; status: string; home_score: number; away_score: number; match_datetime: string;
  home_team: string; away_team: string; home_logo: string | null; away_logo: string | null;
  home_season_team_id: number; away_season_team_id: number; home_team_id: number; away_team_id: number;
};

export type RosterTools = {
  updateJersey: (matchId: number, stid: number, playerId: number, jersey: string) => Promise<SaveResult>;
  removePlayer: (matchId: number, stid: number, playerId: number) => Promise<SaveResult>;
  searchPlayers: (q: string) => Promise<{ id: number; last_name: string; first_name: string }[]>;
  addPlayer: (matchId: number, stid: number, data: { player_id?: number; last_name: string; first_name: string; jersey_no: string; position: string }) => Promise<SaveResult & { player?: RosterPlayer }>;
};

type Props = {
  match: EditorMatch;
  initial: {
    periods: Partial<Record<Period, { home: number | null; away: number | null }>>;
    teamStats: Partial<Record<Side, Partial<Record<TeamStatField, number | null>>>>;
    home: RosterPlayer[];
    away: RosterPlayer[];
    stats: Record<number, Record<string, number | null>>;
  };
  save: (payload: ScorePayload) => Promise<SaveResult>;
  readOnly?: boolean;
  tools?: RosterTools;
};

const s = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));
const n = (v: string) => (v.trim() === '' ? null : Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : null);
const ni = (v: string) => n(v) ?? 0;

const emptyLine = (): Line => ({ dnp: false, v: Object.fromEntries(PLAYER_FIELDS.map((f) => [f, ''])) as Record<PlayerField, string> });

function lineFrom(st: Record<string, number | null> | undefined): Line {
  if (!st) return emptyLine();
  const v = Object.fromEntries(PLAYER_FIELDS.map((f) => [f, s(st[f])])) as Record<PlayerField, string>;
  // Бүх утга 0 бол DNP гэж үзнэ (хадгалахдаа DNP-г 0-ээр хадгалдаг)
  const allZero = PLAYER_FIELDS.every((f) => !st[f]);
  return { dnp: allZero, v: allZero ? emptyLine().v : v };
}

const STATUS_OPTS = [
  ['scheduled', 'Хуваарьт'],
  ['live', 'Шууд'],
  ['finished', 'Дууссан'],
  ['cancelled', 'Цуцлагдсан'],
] as const;

export default function BoxScoreEditor({ match, initial, save, readOnly = false, tools }: Props) {
  const [head, setHead] = useState({ home: s(match.home_score), away: s(match.away_score), status: match.status });
  const [periods, setPeriods] = useState<Record<Period, { home: string; away: string }>>(
    () => Object.fromEntries(PERIODS.map((p) => [p, { home: s(initial.periods[p]?.home), away: s(initial.periods[p]?.away) }])) as Record<Period, { home: string; away: string }>,
  );
  const [teamStats, setTeamStats] = useState<Record<Side, Record<TeamStatField, string>>>(() => ({
    home: Object.fromEntries(TEAM_STAT_FIELDS.map(([f]) => [f, s(initial.teamStats.home?.[f])])) as Record<TeamStatField, string>,
    away: Object.fromEntries(TEAM_STAT_FIELDS.map(([f]) => [f, s(initial.teamStats.away?.[f])])) as Record<TeamStatField, string>,
  }));
  const [rosters, setRosters] = useState<Record<Side, RosterPlayer[]>>({ home: initial.home, away: initial.away });
  const [lines, setLines] = useState<Record<number, Line>>(() => {
    const o: Record<number, Line> = {};
    for (const p of [...initial.home, ...initial.away]) o[p.player_id] = lineFrom(initial.stats[p.player_id]);
    return o;
  });
  const [status, setStatus] = useState<{ text: string; tone: 'muted' | 'warn' | 'ok' | 'err' }>({ text: 'Бэлэн', tone: 'muted' });
  const locked = readOnly;

  const version = useRef(0);
  const savedVersion = useRef(0);
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef({ head, periods, teamStats, rosters, lines });
  stateRef.current = { head, periods, teamStats, rosters, lines };
  // Сүүлд хадгалснаас хойш өөрчлөгдсөн тоглогчид — зөвхөн тэднийг илгээнэ ('all' = бүгдийг)
  const dirty = useRef<Set<number> | 'all'>(new Set());
  const markDirty = (pid: number) => {
    if (dirty.current !== 'all') dirty.current.add(pid);
  };

  const buildPayload = useCallback((ids: Set<number> | 'all'): ScorePayload => {
    const st = stateRef.current;
    const players = (['home', 'away'] as const).flatMap((side) =>
      st.rosters[side].filter((p) => ids === 'all' || ids.has(p.player_id)).map((p) => {
        const l = st.lines[p.player_id] ?? emptyLine();
        return {
          player_id: p.player_id,
          team_id: side === 'home' ? match.home_team_id : match.away_team_id,
          dnp: l.dnp,
          ...(Object.fromEntries(PLAYER_FIELDS.map((f) => [f, n(l.v[f])])) as Record<PlayerField, number | null>),
        };
      }),
    );
    return {
      matchId: match.id,
      home_score: ni(st.head.home),
      away_score: ni(st.head.away),
      status: st.head.status as ScorePayload['status'],
      periods: Object.fromEntries(PERIODS.map((p) => [p, { home: n(st.periods[p].home), away: n(st.periods[p].away) }])),
      teamStats: {
        home: Object.fromEntries(TEAM_STAT_FIELDS.map(([f]) => [f, n(st.teamStats.home[f])])),
        away: Object.fromEntries(TEAM_STAT_FIELDS.map(([f]) => [f, n(st.teamStats.away[f])])),
      },
      players,
    };
  }, [match]);

  const doSave = useCallback(async () => {
    if (locked) return;
    if (saving.current) return;
    if (savedVersion.current === version.current) return;
    saving.current = true;
    const v = version.current;
    const ids = dirty.current;
    dirty.current = new Set();
    // Амжилтгүй бол илгээсэн тоглогчдыг дахин "өөрчлөгдсөн" болгоно
    const restore = () => {
      if (ids === 'all' || dirty.current === 'all') dirty.current = ids === 'all' ? 'all' : dirty.current;
      else ids.forEach((id) => (dirty.current as Set<number>).add(id));
    };
    setStatus({ text: 'Хадгалж байна...', tone: 'warn' });
    try {
      const r = await save(buildPayload(ids));
      if (r.ok) {
        savedVersion.current = v;
        setStatus({ text: `${r.savedAt ?? ''} Хадгалагдлаа`.trim(), tone: 'ok' });
      } else {
        restore();
        setStatus({ text: r.message || 'Алдаа гарлаа', tone: 'err' });
      }
    } catch {
      restore();
      setStatus({ text: 'Холболт тасарлаа — дахин оролдоно уу', tone: 'err' });
    } finally {
      saving.current = false;
      // Хадгалж байх хооронд өөрчлөлт орсон бол дахин хадгална
      if (version.current !== savedVersion.current) schedule();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildPayload, save, locked]);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    // Бичиж дуусмагц (0.4 сек) хадгална — товчлуур бүрт DB руу илгээхгүй
    timer.current = setTimeout(doSave, 400);
  }, [doSave]);

  /** Талбараас гарах (Tab, Enter, дарах) үед хүлээлгүй шууд хадгална */
  const flush = useCallback(() => {
    if (!timer.current) return;
    clearTimeout(timer.current);
    timer.current = null;
    doSave();
  }, [doSave]);

  const touch = useCallback(() => {
    if (locked) return;
    version.current++;
    setStatus({ text: 'Хадгалахаар бэлэн...', tone: 'warn' });
    schedule();
  }, [schedule, locked]);

  // Хадгалаагүй өөрчлөлттэй хаахад анхааруулна
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (version.current !== savedVersion.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);

  const setLine = (pid: number, f: PlayerField, val: string) => {
    setLines((L) => ({ ...L, [pid]: { ...(L[pid] ?? emptyLine()), v: { ...(L[pid] ?? emptyLine()).v, [f]: val } } }));
    markDirty(pid);
    touch();
  };
  const setDnp = (pid: number, dnp: boolean) => {
    setLines((L) => ({ ...L, [pid]: dnp ? { dnp: true, v: emptyLine().v } : { ...(L[pid] ?? emptyLine()), dnp: false } }));
    markDirty(pid);
    touch();
  };

  const teamPts = useMemo(() => {
    const sum = (side: Side) =>
      rosters[side].reduce((a, p) => {
        const l = lines[p.player_id];
        if (!l || l.dnp) return a;
        return a + ni(l.v.two_made) * 2 + ni(l.v.three_made) * 3 + ni(l.v.ft_made);
      }, 0);
    return { home: sum('home'), away: sum('away') };
  }, [rosters, lines]);

  const qSum = useMemo(
    () => ({
      home: PERIODS.reduce((a, p) => a + ni(periods[p].home), 0),
      away: PERIODS.reduce((a, p) => a + ni(periods[p].away), 0),
    }),
    [periods],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const all = Array.from(containerRef.current?.querySelectorAll<HTMLInputElement>('input[data-nav]:not([disabled])') ?? []);
    const i = all.indexOf(e.currentTarget);
    if (i >= 0 && i < all.length - 1) {
      all[i + 1].focus();
      all[i + 1].select();
    }
  };

  const toneCls = { muted: 'text-muted', warn: 'text-amber-700 dark:text-amber-400', ok: 'text-open', err: 'text-live' }[status.tone];

  const Num = ({ value, onChange, w = 'bi', min = 0, max, nav = true, ro = false }: { value: string; onChange: (v: string) => void; w?: string; min?: number; max?: number; nav?: boolean; ro?: boolean }) => (
    <input
      type="number"
      inputMode="numeric"
      className={w}
      value={value}
      min={min}
      max={max}
      placeholder="0"
      readOnly={ro || locked}
      disabled={locked && !ro}
      data-nav={nav && !ro ? '' : undefined}
      onKeyDown={onKeyDown}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={flush}
      onChange={(e) => onChange(e.target.value)}
    />
  );

  return (
    <div ref={containerRef} className="pb-20">
      {/* ── Header ── */}
      <div className="border border-line rounded-xl bg-surface p-4 sm:p-5 mb-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex items-center justify-end gap-3 text-right min-w-0">
            <div className="min-w-0">
              <div className="font-display text-lg sm:text-2xl truncate">{match.home_team}</div>
              <div className="text-xs text-muted">Гэрийн баг</div>
            </div>
            {match.home_logo && <img src={fileUrl(match.home_logo)} alt="" className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shrink-0" />}
          </div>
          <div className="text-center px-2">
            <div className="font-display text-4xl sm:text-5xl leading-none tabular-nums">
              {head.home || 0} <span className="text-muted">—</span> {head.away || 0}
            </div>
            <div className="text-xs text-muted mt-1.5">{fmtDate(match.match_datetime, 'd.m.Y H:i')}</div>
          </div>
          <div className="flex items-center gap-3 min-w-0">
            {match.away_logo && <img src={fileUrl(match.away_logo)} alt="" className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shrink-0" />}
            <div className="min-w-0">
              <div className="font-display text-lg sm:text-2xl truncate">{match.away_team}</div>
              <div className="text-xs text-muted">Зочин баг</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Дүн + Quarter + Team stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 mb-4">
        <div className="border border-line rounded-xl bg-surface p-4">
          <div className="text-[11px] font-medium uppercase tracking-widest text-muted mb-3">Эцсийн дүн & Статус</div>
          <div className="flex items-end gap-2 mb-3">
            {(['home', 'away'] as const).map((side, i) => (
              <div key={side} className="flex-1 flex items-end gap-2">
                {i === 1 && <span className="pb-2 text-muted">—</span>}
                <div className="flex-1">
                  <label className="block text-[11px] text-muted mb-1 truncate">{side === 'home' ? match.home_team : match.away_team}</label>
                  <input
                    type="number"
                    min={0}
                    value={side === 'home' ? head.home : head.away}
                    disabled={locked}
                    onChange={(e) => {
                      setHead((h) => ({ ...h, [side]: e.target.value }));
                      touch();
                    }}
                    className="w-full bg-raise border border-line2 rounded-lg px-2 py-1.5 text-center font-display text-2xl text-ink focus:outline-none focus:border-primary focus:ring-0"
                  />
                </div>
              </div>
            ))}
          </div>
          <select
            value={head.status}
            disabled={locked}
            onChange={(e) => {
              setHead((h) => ({ ...h, status: e.target.value }));
              touch();
            }}
            className="w-full bg-raise border border-line2 rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-primary focus:ring-0"
          >
            {STATUS_OPTS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <div className="mt-3 text-[11px] text-muted space-y-1">
            <div className="flex justify-between"><span>Тоглогчдын оноо:</span><span className="text-ink2">{teamPts.home} — {teamPts.away}</span></div>
            <div className="flex justify-between"><span>Улирлын нийлбэр:</span><span className="text-ink2">{qSum.home} — {qSum.away}</span></div>
            {!locked && (teamPts.home > 0 || teamPts.away > 0) && (String(teamPts.home) !== head.home || String(teamPts.away) !== head.away) && (
              <button
                type="button"
                onClick={() => {
                  setHead((h) => ({ ...h, home: String(teamPts.home), away: String(teamPts.away) }));
                  touch();
                }}
                className="w-full mt-1.5 text-xs font-medium px-2 py-1.5 rounded-md bg-primary/15 text-primary-ink hover:bg-primary/25"
              >
                Тоглогчдын онооноос дүн тавих
              </button>
            )}
          </div>
        </div>

        <div className="border border-line rounded-xl bg-surface p-4 overflow-x-auto">
          <div className="text-[11px] font-medium uppercase tracking-widest text-muted mb-3">Quarter дүн & Багийн статистик</div>
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="text-[11px] text-muted">
                <th className="text-left font-medium py-1.5 pr-2" />
                {PERIODS.map((p) => (
                  <th key={p} className="font-semibold py-1.5 px-1">{p}</th>
                ))}
                {TEAM_STAT_FIELDS.map(([f, l]) => (
                  <th key={f} className="font-medium py-1.5 px-1 text-amber-700/80 dark:text-amber-400/80">{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(['home', 'away'] as const).map((side) => (
                <tr key={side} className="border-t border-line">
                  <td className="py-1.5 pr-2 text-sm font-medium whitespace-nowrap">{side === 'home' ? match.home_team : match.away_team}</td>
                  {PERIODS.map((p) => (
                    <td key={p} className="py-1 px-0.5 text-center">
                      {Num({
                        w: 'bi gi',
                        value: periods[p][side],
                        onChange: (v) => {
                          setPeriods((P) => ({ ...P, [p]: { ...P[p], [side]: v } }));
                          touch();
                        },
                      })}
                    </td>
                  ))}
                  {TEAM_STAT_FIELDS.map(([f]) => (
                    <td key={f} className="py-1 px-0.5 text-center">
                      {Num({
                        w: 'bi gi',
                        value: teamStats[side][f],
                        onChange: (v) => {
                          setTeamStats((T) => ({ ...T, [side]: { ...T[side], [f]: v } }));
                          touch();
                        },
                      })}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Boxscore ── */}
      {(['home', 'away'] as const).map((side) => (
        <TeamBox
          key={side}
          side={side}
          team={side === 'home' ? match.home_team : match.away_team}
          stid={side === 'home' ? match.home_season_team_id : match.away_season_team_id}
          matchId={match.id}
          roster={rosters[side]}
          lines={lines}
          locked={locked}
          Num={Num}
          setLine={setLine}
          setDnp={setDnp}
          tools={tools}
          onRosterChange={(next) => {
            setRosters((R) => ({ ...R, [side]: next(R[side]) }));
          }}
          onAdded={(p) => {
            setLines((L) => ({ ...L, [p.player_id]: L[p.player_id] ?? emptyLine() }));
            markDirty(p.player_id);
            touch();
          }}
        />
      ))}

      {/* ── Sticky footer ── */}
      <div className="fixed bottom-0 right-0 left-0 md:left-60 z-30 bg-surface border-t border-line px-4 md:px-7 py-3 flex items-center justify-between gap-3">
        <span className={`text-sm ${toneCls}`}>{status.text}</span>
        <div className="flex gap-2">
          {!locked && (
            <button
              type="button"
              onClick={() => {
                if (timer.current) clearTimeout(timer.current);
                // Гараар хадгалахад бүх тоглогчийг илгээнэ
                dirty.current = 'all';
                version.current++;
                doSave();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-primary text-primary-ink hover:bg-primary/10"
            >
              <span className="material-icons-round text-base">save</span> Хадгалах
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const HEAD = 'py-2 px-1 text-[11px] font-medium text-center whitespace-nowrap';

function TeamBox({
  side, team, stid, matchId, roster, lines, locked, Num, setLine, setDnp, tools, onRosterChange, onAdded,
}: {
  side: Side;
  team: string;
  stid: number;
  matchId: number;
  roster: RosterPlayer[];
  lines: Record<number, Line>;
  locked: boolean;
  Num: (p: { value: string; onChange: (v: string) => void; w?: string; min?: number; max?: number; nav?: boolean; ro?: boolean }) => React.ReactElement;
  setLine: (pid: number, f: PlayerField, v: string) => void;
  setDnp: (pid: number, d: boolean) => void;
  tools?: RosterTools;
  onRosterChange: (fn: (r: RosterPlayer[]) => RosterPlayer[]) => void;
  onAdded: (p: RosterPlayer) => void;
}) {
  const [adding, setAdding] = useState(false);
  const pair = (pid: number, a: PlayerField, b: PlayerField, disabled: boolean) => (
    <div className={`flex items-center justify-center gap-0.5 ${disabled ? 'opacity-25 pointer-events-none' : ''}`}>
      {Num({ value: lines[pid]?.v[a] ?? '', onChange: (v) => setLine(pid, a, v) })}
      <span className="text-muted text-xs">/</span>
      {Num({ value: lines[pid]?.v[b] ?? '', onChange: (v) => setLine(pid, b, v) })}
    </div>
  );
  const one = (pid: number, f: PlayerField, disabled: boolean, min = 0, max?: number) => (
    <div className={disabled ? 'opacity-25 pointer-events-none' : ''}>
      {Num({ value: lines[pid]?.v[f] ?? '', onChange: (v) => setLine(pid, f, v), min: min, max: max })}
    </div>
  );

  return (
    <div className="border border-line rounded-xl bg-surface mb-4 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line">
        <div className="font-semibold flex items-center gap-2">
          <span className="material-icons-round text-base text-muted">{side === 'home' ? 'home' : 'flight'}</span>
          {team} <span className="text-xs text-muted font-normal">{roster.length} тоглогч</span>
        </div>
        {tools && !locked && (
          <button type="button" onClick={() => setAdding((a) => !a)} className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-primary/15 text-primary-ink hover:bg-primary/25 inline-flex items-center gap-1">
            <span className="material-icons-round text-sm">person_add</span> Тоглогч нэмэх
          </button>
        )}
      </div>
      {adding && tools && (
        <AddPlayer
          tools={tools}
          matchId={matchId}
          stid={stid}
          onDone={(p) => {
            if (p) {
              onRosterChange((r) => (r.some((x) => x.player_id === p.player_id) ? r : [...r, p]));
              onAdded(p);
            }
            setAdding(false);
          }}
        />
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr className="bg-raise text-muted">
              <th className="sticky-col bg-raise text-left py-2 px-3 text-[11px] font-medium min-w-[180px]">Тоглогч</th>
              <th className={HEAD}>DNP</th>
              <th className={HEAD}>MIN:SEC</th>
              <th className={`${HEAD} text-primary-ink`}>2PM/A</th>
              <th className={`${HEAD} text-primary-ink`}>3PM/A</th>
              <th className={`${HEAD} text-primary-ink`}>FTM/A</th>
              <th className={HEAD}>OR</th>
              <th className={HEAD}>DR</th>
              <th className={`${HEAD} text-reg`}>REB</th>
              <th className={`${HEAD} text-reg`}>AST</th>
              <th className={`${HEAD} text-amber-700 dark:text-amber-400`}>TO</th>
              <th className={`${HEAD} text-open`}>STL</th>
              <th className={`${HEAD} text-open`}>BLK</th>
              <th className={`${HEAD} text-live`}>PF</th>
              <th className={HEAD}>+/-</th>
              <th className={`${HEAD} text-primary`}>PTS</th>
              {tools && !locked && <th className={HEAD} />}
            </tr>
          </thead>
          <tbody>
            {roster.map((p) => {
              const l = lines[p.player_id];
              const dnp = !!l?.dnp;
              const pts = dnp || !l ? 0 : ni(l.v.two_made) * 2 + ni(l.v.three_made) * 3 + ni(l.v.ft_made);
              const reb = dnp || !l ? 0 : ni(l.v.reb_off) + ni(l.v.reb_def);
              return (
                <tr key={p.player_id} className="border-t border-line">
                  <td className="sticky-col bg-surface py-1.5 px-3">
                    <div className="flex items-center gap-2">
                      {p.photo_path ? (
                        <img src={fileUrl(p.photo_path)} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                      ) : (
                        <span className="w-7 h-7 rounded-full bg-line grid place-items-center shrink-0 material-icons-round text-sm text-muted">person</span>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold whitespace-nowrap">{p.last_name} {p.first_name}</div>
                        <div className="text-[10px] text-muted flex items-center gap-1">
                          {tools && !locked ? (
                            <JerseyEdit tools={tools} matchId={matchId} stid={stid} p={p} onSaved={(j) => onRosterChange((r) => r.map((x) => (x.player_id === p.player_id ? { ...x, jersey_no: j } : x)))} />
                          ) : (
                            <span>#{p.jersey_no ?? '—'}</span>
                          )}
                          {p.position && <span>{p.position}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center px-1">
                    <input type="checkbox" checked={dnp} disabled={locked} onChange={(e) => setDnp(p.player_id, e.target.checked)} className="rounded bg-raise border-line2 text-primary focus:ring-0" />
                  </td>
                  <td className="px-1">
                    <div className={`flex items-center justify-center gap-0.5 ${dnp ? 'opacity-25 pointer-events-none' : ''}`}>
                      {Num({ value: l?.v.minutes ?? '', onChange: (v) => setLine(p.player_id, 'minutes', v), max: 70 })}
                      <span className="text-muted font-bold">:</span>
                      {Num({ value: l?.v.seconds ?? '', onChange: (v) => setLine(p.player_id, 'seconds', v), max: 59 })}
                    </div>
                  </td>
                  <td className="px-1">{pair(p.player_id, 'two_made', 'two_attempts', dnp)}</td>
                  <td className="px-1">{pair(p.player_id, 'three_made', 'three_attempts', dnp)}</td>
                  <td className="px-1">{pair(p.player_id, 'ft_made', 'ft_attempts', dnp)}</td>
                  <td className="px-1 text-center">{one(p.player_id, 'reb_off', dnp)}</td>
                  <td className="px-1 text-center">{one(p.player_id, 'reb_def', dnp)}</td>
                  <td className="px-1 text-center"><input className="bi" readOnly value={reb || ''} placeholder="0" tabIndex={-1} /></td>
                  <td className="px-1 text-center">{one(p.player_id, 'assists', dnp)}</td>
                  <td className="px-1 text-center">{one(p.player_id, 'turnovers', dnp)}</td>
                  <td className="px-1 text-center">{one(p.player_id, 'steals', dnp)}</td>
                  <td className="px-1 text-center">{one(p.player_id, 'blocks', dnp)}</td>
                  <td className="px-1 text-center">{one(p.player_id, 'fouls_committed', dnp, 0, 6)}</td>
                  <td className="px-1 text-center">{one(p.player_id, 'plus_minus', dnp, -200)}</td>
                  <td className="px-1 text-center">
                    <input className="bi font-bold !text-primary" readOnly value={pts || ''} placeholder="0" tabIndex={-1} />
                  </td>
                  {tools && !locked && (
                    <td className="px-1 text-center">
                      <button
                        type="button"
                        title="Roster-оос хасах"
                        onClick={async () => {
                          if (!window.confirm(`${p.last_name} ${p.first_name}-г roster-оос хасах уу?`)) return;
                          const r = await tools.removePlayer(matchId, stid, p.player_id);
                          if (r.ok) onRosterChange((rs) => rs.filter((x) => x.player_id !== p.player_id));
                          else alert(r.message);
                        }}
                        className="w-6 h-6 grid place-items-center rounded text-muted hover:text-live hover:bg-live/10"
                      >
                        <span className="material-icons-round text-sm">close</span>
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {roster.length === 0 && (
              <tr>
                <td colSpan={17} className="py-6 text-center text-muted text-sm">Roster хоосон байна</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JerseyEdit({ tools, matchId, stid, p, onSaved }: { tools: RosterTools; matchId: number; stid: number; p: RosterPlayer; onSaved: (j: string | null) => void }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(p.jersey_no ?? '');
  if (!edit)
    return (
      <button type="button" onClick={() => setEdit(true)} className="border-b border-dashed border-muted hover:text-primary" title="Дугаар өөрчлөх">
        #{p.jersey_no ?? '—'}
      </button>
    );
  const commit = async () => {
    setEdit(false);
    if (v === (p.jersey_no ?? '')) return;
    const r = await tools.updateJersey(matchId, stid, p.player_id, v);
    if (r.ok) onSaved(v || null);
    else alert(r.message);
  };
  return (
    <input
      autoFocus
      className="bi !w-10 !text-[11px]"
      value={v}
      maxLength={3}
      onChange={(e) => setV(e.target.value.replace(/\D/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setEdit(false);
      }}
    />
  );
}

function AddPlayer({ tools, matchId, stid, onDone }: { tools: RosterTools; matchId: number; stid: number; onDone: (p?: RosterPlayer) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ id: number; last_name: string; first_name: string }[]>([]);
  const [pick, setPick] = useState<{ id?: number; last: string; first: string }>({ last: '', first: '' });
  const [jersey, setJersey] = useState('');
  const [pos, setPos] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => tools.searchPlayers(q.trim()).then(setResults).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [q, tools]);

  const inp = 'bg-raise border border-line2 rounded-md px-2.5 py-1.5 text-sm text-ink focus:outline-none focus:border-primary focus:ring-0';
  return (
    <div className="px-4 py-3 border-b border-line bg-raise/40 space-y-3">
      <div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Бүртгэлтэй тоглогч хайх (2+ үсэг)..." className={`${inp} w-full max-w-md`} />
        {results.length > 0 && (
          <div className="mt-1.5 max-w-md border border-line2 rounded-md max-h-48 overflow-y-auto">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setPick({ id: r.id, last: r.last_name, first: r.first_name });
                  setResults([]);
                  setQ('');
                }}
                className="block w-full text-left px-3 py-1.5 text-sm hover:bg-primary/15 border-b border-line last:border-0"
              >
                {r.last_name} {r.first_name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2 items-end">
        <input value={pick.last} onChange={(e) => setPick({ last: e.target.value, first: pick.first })} placeholder="Овог *" className={`${inp} w-36`} />
        <input value={pick.first} onChange={(e) => setPick({ last: pick.last, first: e.target.value })} placeholder="Нэр *" className={`${inp} w-36`} />
        <input value={jersey} onChange={(e) => setJersey(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="#" className={`${inp} w-16`} />
        <select value={pos} onChange={(e) => setPos(e.target.value)} className={`${inp} w-24`}>
          <option value="">Байр</option>
          {['PG', 'SG', 'SF', 'PF', 'C'].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy || !pick.last.trim() || !pick.first.trim()}
          onClick={async () => {
            setBusy(true);
            const r = await tools.addPlayer(matchId, stid, { player_id: pick.id, last_name: pick.last, first_name: pick.first, jersey_no: jersey, position: pos });
            setBusy(false);
            if (r.ok && r.player) onDone(r.player);
            else setMsg(r.message);
          }}
          className="px-3 py-1.5 rounded-md text-sm font-medium bg-primary text-white disabled:opacity-50"
        >
          {pick.id ? 'Нэмэх' : 'Шинээр үүсгэж нэмэх'}
        </button>
        <button type="button" onClick={() => onDone()} className="px-3 py-1.5 rounded-md text-sm text-muted hover:text-ink">
          Болих
        </button>
      </div>
      {msg && <div className="text-xs text-live">{msg}</div>}
    </div>
  );
}
