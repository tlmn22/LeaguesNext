/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { Metadata } from 'next';
import { query } from '@/lib/db';
import { DAY_MN, DAY_MN_SHORT, accentOf, addDays, countdown, dayIndex, fileUrl, fmtDate, initials, isoDateOk, nowUB, todayUB } from '@/lib/format';
import { leagueHref } from '@/components/public/LeagueCard';
import { NavDateInput } from '@/components/public/NavSelect';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Тоглолтууд' };

type Row = {
  id: number; match_datetime: string; status: string; home_score: number; away_score: number; arena_name: string | null;
  lid: number; lg_name: string; slug: string | null; primary_color: string | null; lg_logo: string | null;
  sid: number; sname: string; ht: string; hl: string | null; at: string; al: string | null;
};

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const sp = await searchParams;
  const today = todayUB();
  const date = sp.d && isoDateOk(sp.d) ? sp.d : today;
  const prev = addDays(date, -1);
  const next = addDays(date, 1);
  const now = nowUB();

  const rows = await query<Row>(
    `SELECT m.id, m.match_datetime, m.status, m.home_score, m.away_score, m.arena_name,
            l.id AS lid, l.name AS lg_name, l.slug, l.primary_color, l.logo AS lg_logo,
            s.id AS sid, s.name AS sname,
            ht.name AS ht, ht.logo_path AS hl, at2.name AS at, at2.logo_path AS al
     FROM matches m
     JOIN seasons s ON s.id = m.season_id
     JOIN leagues l ON l.id = s.league_id
     JOIN season_teams hst ON hst.id = m.home_season_team_id
     JOIN season_teams ast ON ast.id = m.away_season_team_id
     JOIN teams ht ON ht.id = hst.team_id
     JOIN teams at2 ON at2.id = ast.team_id
     WHERE m.match_datetime >= ? AND m.match_datetime < ?
     ORDER BY l.id ASC, m.match_datetime ASC`,
    [`${date} 00:00:00`, `${next} 00:00:00`],
  );

  // Лиг/улирлаар бүлэглэх
  const groups = new Map<string, { lid: number; sid: number; lg_name: string; sname: string; slug: string | null; color: string; lg_logo: string | null; matches: Row[] }>();
  for (const r of rows) {
    const key = `${r.lid}_${r.sid}`;
    if (!groups.has(key))
      groups.set(key, { lid: r.lid, sid: r.sid, lg_name: r.lg_name, sname: r.sname, slug: r.slug, color: accentOf(r.primary_color), lg_logo: r.lg_logo, matches: [] });
    groups.get(key)!.matches.push(r);
  }

  const week = [-3, -2, -1, 0, 1, 2, 3].map((i) => addDays(date, i));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="font-display text-4xl sm:text-5xl uppercase mb-6">
        {fmtDate(date, 'd/m')} <span className="text-muted">{DAY_MN[dayIndex(date)].toUpperCase()}</span>
      </h1>

      <div className="flex items-center gap-3 border-t border-b border-line py-3 mb-8">
        <Link href={`/schedule?d=${prev}`} aria-label="Өмнөх өдөр" className="w-9 h-9 rounded-lg border border-line2 grid place-items-center text-ink2 hover:text-primary hover:border-primary transition-colors shrink-0">
          <span className="material-icons-round text-lg">chevron_left</span>
        </Link>
        <div className="flex flex-1 gap-1.5 overflow-x-auto">
          {week.map((wd) => {
            const sel = wd === date;
            const tod = wd === today;
            return (
              <Link
                key={wd}
                href={`/schedule?d=${wd}`}
                className={`flex flex-col items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                  sel ? 'bg-primary text-white' : tod ? 'text-primary-ink border border-primary/40' : 'text-ink2 hover:bg-line'
                }`}
              >
                <span className="uppercase tracking-wide text-[10px] opacity-80">{DAY_MN_SHORT[dayIndex(wd)]}</span>
                <span className="text-base font-display leading-tight">{fmtDate(wd, 'd')}</span>
              </Link>
            );
          })}
        </div>
        <Link href={`/schedule?d=${next}`} aria-label="Дараагийн өдөр" className="w-9 h-9 rounded-lg border border-line2 grid place-items-center text-ink2 hover:text-primary hover:border-primary transition-colors shrink-0">
          <span className="material-icons-round text-lg">chevron_right</span>
        </Link>
        <label className="hidden sm:flex items-center gap-2 pl-3 border-l border-line text-xs text-muted shrink-0">
          <NavDateInput value={date} hrefTemplate="/schedule?d={v}" className="h-9 px-2 rounded-lg border border-line2 bg-surface text-ink text-xs" />
        </label>
      </div>

      {groups.size === 0 ? (
        <div className="text-center py-20 border border-dashed border-line2 rounded-lg">
          <div className="font-display text-2xl uppercase text-ink2 mb-2">Тоглолт байхгүй</div>
          <p className="text-muted text-sm mb-6">Энэ өдөрт хуваарьт тоглолт бүртгэгдээгүй байна.</p>
          <Link href={`/schedule?d=${today}`} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-primary text-primary-ink hover:bg-primary/10 text-sm font-medium transition-colors">
            Өнөөдөр
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {[...groups.values()].map((g) => (
            <div key={`${g.lid}_${g.sid}`}>
              <div className="flex items-center gap-3 mb-2">
                <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0 overflow-hidden font-display text-sm" style={{ background: g.color + '1a', color: g.color }}>
                  {g.lg_logo ? <img src={fileUrl(g.lg_logo)} alt="" className="w-full h-full object-contain" /> : initials(g.lg_name)}
                </span>
                <h2 className="font-display text-xl uppercase tracking-wide">{g.lg_name}</h2>
                <span className="text-xs text-muted">{g.sname}</span>
                <Link href={leagueHref(g.slug, g.lid, g.sid, 'matches')} className="ml-auto text-xs font-medium shrink-0 text-primary-ink hover:text-primary">
                  Лиг харах →
                </Link>
              </div>

              <div className="border-t border-line">
                {g.matches.map((m) => {
                  const fin = m.status === 'finished';
                  const hw = fin && m.home_score > m.away_score;
                  const aw = fin && m.away_score > m.home_score;
                  return (
                    <Link key={m.id} href={`/match/${m.id}`} className="flex flex-col gap-2 px-2 py-3.5 border-b border-line hover:bg-primary/[0.04] transition-colors group">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 min-w-0 text-[11px] text-muted">
                          <span className="font-display text-sm text-ink2 shrink-0">{fmtDate(m.match_datetime, 'H:i')}</span>
                          {m.arena_name && <span className="truncate" title={m.arena_name}>· {m.arena_name}</span>}
                        </span>
                        <span className={`text-[10px] font-medium uppercase tracking-wide shrink-0 ${fin ? 'text-done' : m.status === 'live' ? 'text-live' : 'text-muted'}`}>
                          {fin ? 'Дууссан' : m.status === 'live' ? 'Шууд' : countdown(m.match_datetime, now) ?? 'Хуваарьт'}
                        </span>
                      </div>
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <span className="flex items-center gap-2 justify-end min-w-0">
                          <span className={`font-medium text-sm truncate text-right ${hw ? '' : 'text-ink2'}`}>{m.ht}</span>
                          <span className="w-7 h-7 rounded-md bg-line grid place-items-center text-[10px] font-medium shrink-0 overflow-hidden">
                            {m.hl ? <img src={fileUrl(m.hl)} alt="" className="w-full h-full object-cover" /> : initials(m.ht)}
                          </span>
                        </span>
                        <span className="shrink-0 text-center px-1">
                          {fin ? (
                            <span className="font-display text-xl tabular-nums">
                              <span className={hw ? '' : 'text-muted'}>{m.home_score}</span>
                              <span className="text-line2 mx-0.5">:</span>
                              <span className={aw ? '' : 'text-muted'}>{m.away_score}</span>
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-muted">VS</span>
                          )}
                        </span>
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="w-7 h-7 rounded-md bg-line grid place-items-center text-[10px] font-medium shrink-0 overflow-hidden">
                            {m.al ? <img src={fileUrl(m.al)} alt="" className="w-full h-full object-cover" /> : initials(m.at)}
                          </span>
                          <span className={`font-medium text-sm truncate ${aw ? '' : 'text-ink2'}`}>{m.at}</span>
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
