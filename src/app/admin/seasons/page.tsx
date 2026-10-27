import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { fmtDate } from '@/lib/format';
import { BTN, Crumbs, Empty, ICON_BTN, ICON_BTN_DANGER, I, PageHead, Pill, TH, TD, TR } from '@/components/admin/ui';
import { ConfirmButton } from '@/components/admin/client';
import { NavSelect } from '@/components/public/NavSelect';
import { deleteSeason } from './actions';

export const metadata = { title: 'Улирал' };

export default async function SeasonsAdmin({ searchParams }: { searchParams: Promise<{ league_id?: string }> }) {
  const user = await requireRole(['admin', 'commissioner']);
  const isAdm = user.role === 'admin';
  const filter = isAdm ? parseInt((await searchParams).league_id ?? '', 10) || 0 : Number(user.league_id ?? -1);

  const [leagues, seasons] = await Promise.all([
    isAdm ? query<{ id: number; name: string }>('SELECT id, name FROM leagues ORDER BY name') : Promise.resolve([]),
    query<{ id: number; name: string; description: string | null; start_date: string | null; end_date: string | null; status: string; league_name: string; team_count: number; match_count: number }>(
      `SELECT s.id, s.name, s.description, s.start_date, s.end_date, s.status, l.name AS league_name,
              (SELECT COUNT(*) FROM season_teams st WHERE st.season_id=s.id) AS team_count,
              (SELECT COUNT(*) FROM matches m WHERE m.season_id=s.id) AS match_count
       FROM seasons s LEFT JOIN leagues l ON l.id=s.league_id
       ${filter ? 'WHERE s.league_id=?' : ''}
       ORDER BY s.created_at DESC`,
      filter ? [filter] : [],
    ),
  ]);

  return (
    <>
      <Crumbs items={[['Dashboard', '/admin'], ['Улирал']]} />
      <PageHead title="Улирлууд" count={seasons.length}>
        <Link href="/admin/seasons/new" className={BTN}>
          <I n="add" className="text-base" /> Шинэ улирал
        </Link>
      </PageHead>

      {isAdm && leagues.length > 0 && (
        <div className="flex items-center gap-3 mb-5">
          <label className="text-xs text-muted whitespace-nowrap">Лигээр шүүх:</label>
          <NavSelect value={filter} hrefTemplate="/admin/seasons?league_id={v}" className="max-w-[260px] bg-surface border border-line2 rounded-lg px-3 py-2 pr-8 text-sm text-ink focus:outline-none focus:border-primary">
            <option value="0">— Бүгд —</option>
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </NavSelect>
        </div>
      )}

      {seasons.length === 0 ? (
        <Empty icon="calendar_month">Улирал байхгүй байна</Empty>
      ) : (
        <div className="overflow-x-auto border border-line rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-[11px] uppercase tracking-wide border-b border-line">
                <th className={`${TH} px-4`}>Улирал</th>
                {isAdm && <th className={TH}>Лиг</th>}
                <th className={TH}>Хугацаа</th>
                <th className={`${TH} !text-center`}>Багууд</th>
                <th className={`${TH} !text-center`}>Тоглолт</th>
                <th className={TH}>Статус</th>
                <th className="w-28 py-2.5 px-4" />
              </tr>
            </thead>
            <tbody>
              {seasons.map((s) => (
                <tr key={s.id} className={TR}>
                  <td className={`${TD} px-4`}>
                    <Link href={`/admin/seasons/${s.id}`} className="font-medium hover:text-primary">{s.name}</Link>
                    {s.description && <div className="text-xs text-muted truncate max-w-[280px]">{s.description}</div>}
                  </td>
                  {isAdm && <td className={`${TD} text-ink2 whitespace-nowrap`}>{s.league_name}</td>}
                  <td className={`${TD} text-ink2 whitespace-nowrap`}>
                    {fmtDate(s.start_date, 'd.m.Y')}
                    {s.end_date ? ` — ${fmtDate(s.end_date, 'd.m.Y')}` : ''}
                  </td>
                  <td className={`${TD} text-center text-ink2`}>{s.team_count}</td>
                  <td className={`${TD} text-center text-ink2`}>{s.match_count}</td>
                  <td className={TD}><Pill status={s.status} /></td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-1.5 justify-end">
                      <Link href={`/admin/seasons/${s.id}`} title="Дэлгэрэнгүй" className={ICON_BTN}><I n="visibility" className="text-sm" /></Link>
                      <Link href={`/admin/seasons/${s.id}/edit`} title="Засах" className={ICON_BTN}><I n="edit" className="text-sm" /></Link>
                      <form action={deleteSeason}>
                        <input type="hidden" name="id" value={s.id} />
                        <ConfirmButton message={`"${s.name}" улирлыг устгах уу?`} className={ICON_BTN_DANGER} title="Устгах">
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
      )}
    </>
  );
}
