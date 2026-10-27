import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { fmtDate } from '@/lib/format';
import { BTN, Crumbs, Empty, ICON_BTN, ICON_BTN_DANGER, I, PageHead, TH, TD, TR, Thumb } from '@/components/admin/ui';
import { ConfirmButton } from '@/components/admin/client';
import { deleteLeague } from './actions';

export const metadata = { title: 'Лигүүд' };

const TIER_COLOR: Record<number, string> = { 1: '#3fb173', 2: '#5b9bdd', 3: '#75798c' };

export default async function LeaguesAdmin() {
  await requireRole(['admin']);
  const leagues = await query<{ id: number; name: string; slug: string; tier: number; logo: string | null; primary_color: string | null; location: string | null; created_at: string; commissioner_name: string | null; season_cnt: number }>(
    `SELECT l.*, u.name AS commissioner_name, (SELECT COUNT(*) FROM seasons s WHERE s.league_id=l.id) AS season_cnt
     FROM leagues l LEFT JOIN users u ON u.id = l.commissioner_user_id
     ORDER BY l.tier ASC, l.created_at DESC`,
  );

  return (
    <>
      <Crumbs items={[['Dashboard', '/admin'], ['Лигүүд']]} />
      <PageHead title="Бүх лигүүд" count={leagues.length}>
        <Link href="/admin/leagues/new" className={BTN}>
          <I n="add" className="text-base" /> Шинэ лиг
        </Link>
      </PageHead>

      {leagues.length === 0 ? (
        <Empty icon="emoji_events">Лиг байхгүй байна</Empty>
      ) : (
        <div className="overflow-x-auto border border-line rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-[11px] uppercase tracking-wide border-b border-line">
                <th className={`${TH} px-4`}>Лиг</th>
                <th className={TH}>Tier</th>
                <th className={TH}>Байршил</th>
                <th className={TH}>Комиссар</th>
                <th className={`${TH} !text-center`}>Улирал</th>
                <th className={TH}>Үүсгэсэн</th>
                <th className="w-32 py-2.5 px-4" />
              </tr>
            </thead>
            <tbody>
              {leagues.map((l) => {
                const tc = TIER_COLOR[l.tier] ?? '#75798c';
                return (
                  <tr key={l.id} className={TR}>
                    <td className={`${TD} px-4`}>
                      <div className="flex items-center gap-3">
                        <Thumb src={l.logo} style={l.primary_color ? { background: l.primary_color + '1a', color: l.primary_color } : undefined} />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{l.name}</div>
                          {l.slug && <div className="text-xs text-muted truncate">{l.slug}</div>}
                        </div>
                      </div>
                    </td>
                    <td className={TD}>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ color: tc, background: tc + '1a' }}>Tier {l.tier}</span>
                    </td>
                    <td className={`${TD} text-ink2 whitespace-nowrap`}>{l.location || '—'}</td>
                    <td className={`${TD} text-ink2 whitespace-nowrap`}>{l.commissioner_name || '—'}</td>
                    <td className={`${TD} text-center text-ink2`}>{l.season_cnt}</td>
                    <td className={`${TD} text-muted whitespace-nowrap`}>{fmtDate(l.created_at, 'd.m.Y')}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5 justify-end">
                        <a href={`/league/${encodeURIComponent(l.slug || String(l.id))}`} target="_blank" rel="noopener" title="Сайтад харах" className={ICON_BTN}>
                          <I n="open_in_new" className="text-sm" />
                        </a>
                        <Link href={`/admin/leagues/${l.id}`} title="Засах" className={ICON_BTN}>
                          <I n="edit" className="text-sm" />
                        </Link>
                        <form action={deleteLeague}>
                          <input type="hidden" name="id" value={l.id} />
                          <ConfirmButton message={`"${l.name}" лигийг устгах уу? Буцаах боломжгүй.`} className={ICON_BTN_DANGER} title="Устгах">
                            <I n="delete" className="text-sm" />
                          </ConfirmButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
