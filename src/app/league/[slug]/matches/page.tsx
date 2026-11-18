import Link from 'next/link';
import type { Metadata } from 'next';
import { getLeagueCtx } from '@/lib/league';
import { fmtDate, isoDateOk } from '@/lib/format';
import LeagueShell from '@/components/league/LeagueShell';
import { NavDateInput, NavSelect } from '@/components/public/NavSelect';
import { Icon } from '@/components/public/lmn';
import ScheduleView from '@/components/public/ScheduleView';

export const dynamic = 'force-dynamic';
type P = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ s?: string; f?: string; d?: string; past?: string; upcoming?: string }>;
};

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const ctx = await getLeagueCtx((await params).slug, (await searchParams).s);
  return { title: `Тоглолтууд — ${ctx.lg.name}` };
}

export default async function LeagueMatches({ params, searchParams }: P) {
  const sp = await searchParams;
  const ctx = await getLeagueCtx((await params).slug, sp.s);
  const filter = sp.f === 'done' || sp.f === 'upcoming' ? sp.f : 'all';
  const date = sp.d && isoDateOk(sp.d) && fmtDate(sp.d, 'Y-m-d') === sp.d ? sp.d : '';
  const basePath = `/league/${encodeURIComponent(ctx.slug)}/matches`;
  const baseParams = { s: String(ctx.sid), f: filter };
  const baseQuery = new URLSearchParams(baseParams).toString();
  return (
    <LeagueShell ctx={ctx} active="matches">
      <ScheduleView leagueId={ctx.lg.id} seasonId={ctx.sid} date={date} filter={filter} label={`${ctx.lg.name}${ctx.season ? ' · ' + ctx.season.name : ''}`} basePath={basePath} baseParams={baseParams} past={sp.past} upcoming={sp.upcoming} withinLeague filters={
        <div className="sc-filters">
          <label className="sc-filter"><span>Тоглолтын төлөв</span>
            <NavSelect value={filter} hrefTemplate={`${basePath}?s=${ctx.sid}&f={v}${date ? '&d=' + date : ''}`} className="sc-input">
              <option value="all">Бүх тоглолт</option>
              <option value="done">Дууссан</option>
              <option value="upcoming">Хуваарьт / Шууд</option>
            </NavSelect>
          </label>
          <label className="sc-filter sc-date-filter"><span>Огноо</span>
            <NavDateInput key={date} value={date} hrefTemplate={`${basePath}?${baseQuery}&d={v}`} className="sc-input" />
          </label>
          {date && <Link href={`${basePath}?${baseQuery}`} className="sc-reset"><Icon n="close" />Огноог арилгах</Link>}
        </div>
      } />
    </LeagueShell>
  );
}
