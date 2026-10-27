import Link from 'next/link';
import { isAdmin, requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { fmtDate } from '@/lib/format';
import { BTN, Crumbs, Empty, ICON_BTN, ICON_BTN_DANGER, I, PageHead, Pill, TH, TD, TR, Thumb } from '@/components/admin/ui';
import { ConfirmButton } from '@/components/admin/client';
import { deleteNews } from './actions';

export const metadata = { title: 'Мэдээ' };

export default async function NewsAdmin() {
  const user = await requireRole(['admin', 'commissioner']);
  const admin = isAdmin(user);
  const news = await query<{ id: number; title: string; status: string; cover_image: string | null; published_at: string | null; created_at: string; league_name: string | null; season_name: string | null }>(
    `SELECT n.id, n.title, n.status, n.cover_image, n.published_at, n.created_at, l.name AS league_name, s.name AS season_name
     FROM news n LEFT JOIN seasons s ON s.id=n.season_id LEFT JOIN leagues l ON l.id=s.league_id
     ${admin ? '' : 'WHERE s.league_id=?'}
     ORDER BY COALESCE(n.published_at, n.created_at) DESC, n.id DESC`,
    admin ? [] : [user.league_id ?? 0],
  );

  return (
    <>
      <Crumbs items={[['Dashboard', '/admin'], ['Мэдээ']]} />
      <PageHead title="Мэдээ" count={news.length}>
        <Link href="/admin/news/new" className={BTN}>
          <I n="add" className="text-base" /> Шинэ мэдээ
        </Link>
      </PageHead>

      {news.length === 0 ? (
        <Empty icon="newspaper">Мэдээ байхгүй байна</Empty>
      ) : (
        <div className="overflow-x-auto border border-line rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-[11px] uppercase tracking-wide border-b border-line">
                <th className={`${TH} px-4`}>Гарчиг</th>
                <th className={TH}>Лиг</th>
                <th className={TH}>Төлөв</th>
                <th className={TH}>Нийтэлсэн</th>
                <th className="w-32 py-2.5 px-4" />
              </tr>
            </thead>
            <tbody>
              {news.map((n) => (
                <tr key={n.id} className={TR}>
                  <td className={`${TD} px-4`}>
                    <div className="flex items-center gap-3">
                      <Thumb src={n.cover_image} className="w-16 h-10 rounded-md" icon="newspaper" />
                      <div className="font-medium line-clamp-2 min-w-0">{n.title}</div>
                    </div>
                  </td>
                  <td className={`${TD} text-ink2`}>
                    {n.league_name ? (
                      <>
                        <div className="whitespace-nowrap">{n.league_name}</div>
                        <div className="text-xs text-muted whitespace-nowrap">{n.season_name}</div>
                      </>
                    ) : (
                      <span className="text-muted">Ерөнхий</span>
                    )}
                  </td>
                  <td className={TD}><Pill status={n.status} /></td>
                  <td className={`${TD} text-muted whitespace-nowrap`}>{n.published_at ? fmtDate(n.published_at, 'd.m.Y H:i') : '—'}</td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-1.5 justify-end">
                      {n.status === 'published' && (
                        <a href={`/news/${n.id}`} target="_blank" rel="noopener" title="Сайтад харах" className={ICON_BTN}>
                          <I n="open_in_new" className="text-sm" />
                        </a>
                      )}
                      <Link href={`/admin/news/${n.id}`} title="Засах" className={ICON_BTN}>
                        <I n="edit" className="text-sm" />
                      </Link>
                      <form action={deleteNews}>
                        <input type="hidden" name="id" value={n.id} />
                        <ConfirmButton message={`"${n.title}" мэдээг устгах уу? Буцаах боломжгүй.`} className={ICON_BTN_DANGER} title="Устгах">
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
