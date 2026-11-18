import Link from 'next/link';
import type { Metadata } from 'next';
import { query } from '@/lib/db';
import { fmtDate, isoDateOk } from '@/lib/format';
import { NavDateInput, NavSelect } from '@/components/public/NavSelect';
import { Icon } from '@/components/public/lmn';
import ScheduleView from '@/components/public/ScheduleView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Тоглолтууд ба үр дүн' };

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ league?: string; d?: string; past?: string; upcoming?: string }> }) {
  const sp = await searchParams;
  const leagues = await query<{ id: number; name: string }>('SELECT id, name FROM leagues ORDER BY tier, name');
  const league = leagues.find((l) => l.id === Number.parseInt(sp.league ?? '', 10));
  const leagueId = league?.id ?? 0;
  const date = sp.d && isoDateOk(sp.d) && fmtDate(sp.d, 'Y-m-d') === sp.d ? sp.d : '';
  const baseParams: Record<string, string> = league ? { league: String(leagueId) } : {};
  return (
    <ScheduleView leagueId={leagueId} date={date} label={league?.name ?? 'Бүх лиг'} basePath="/schedule" baseParams={baseParams} past={sp.past} upcoming={sp.upcoming} filters={
      <div className="sc-filters">
        <label className="sc-filter"><span>Лиг сонгох</span>
          <NavSelect value={leagueId || ''} hrefTemplate={`/schedule?league={v}${date ? '&d=' + date : ''}`} className="sc-input">
            <option value="">Бүх лиг</option>
            {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </NavSelect>
        </label>
        <label className="sc-filter sc-date-filter"><span>Огноо</span>
          <NavDateInput key={date} value={date} hrefTemplate={`/schedule?${leagueId ? 'league=' + leagueId + '&' : ''}d={v}`} className="sc-input" />
        </label>
        {date && <Link href={leagueId ? `/schedule?league=${leagueId}` : '/schedule'} className="sc-reset"><Icon n="close" />Огноог арилгах</Link>}
      </div>
    } />
  );
}
