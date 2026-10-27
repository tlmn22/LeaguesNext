import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { query, scalar } from '@/lib/db';
import { BTN, BTN_GHOST, Crumbs, Empty, GENDER, ICON_BTN, ICON_BTN_DANGER, I, INP, PageHead, TH, TD, TR, Thumb } from '@/components/admin/ui';
import { ConfirmButton } from '@/components/admin/client';
import Pager from '@/components/admin/Pager';
import { deleteTeam } from './actions';

export const metadata = { title: 'Багууд' };
const PER = 25;

export default async function TeamsAdmin({ searchParams }: { searchParams: Promise<{ q?: string; gender?: string; p?: string }> }) {
  await requireRole(['admin', 'commissioner']);
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const gender = ['M', 'F', 'Mixed'].includes(sp.gender ?? '') ? sp.gender! : '';
  const page = Math.max(1, parseInt(sp.p ?? '1', 10) || 1);

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (q) {
    where.push('(t.name ILIKE ? OR t.short_name ILIKE ? OR t.city ILIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (gender) {
    where.push('t.gender=?');
    params.push(gender);
  }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = Number(await scalar(`SELECT COUNT(*) FROM teams t ${w}`, params));
  const teams = await query<{ id: number; name: string; short_name: string | null; city: string | null; gender: string; logo_path: string | null; season_count: number; player_count: number }>(
    `SELECT t.id, t.name, t.short_name, t.city, t.gender, t.logo_path,
            (SELECT COUNT(*) FROM season_teams st WHERE st.team_id=t.id) AS season_count,
            (SELECT COUNT(DISTINCT tsr.player_id) FROM team_season_roster tsr WHERE tsr.team_id=t.id) AS player_count
     FROM teams t ${w} ORDER BY t.name ASC LIMIT ? OFFSET ?`,
    [...params, PER, (page - 1) * PER],
  );
  const pages = Math.ceil(total / PER);
  const qs = (p: number) => `/admin/teams?${new URLSearchParams({ ...(q && { q }), ...(gender && { gender }), p: String(p) })}`;

  return (
    <>
      <Crumbs items={[['Dashboard', '/admin'], ['Багууд']]} />
      <PageHead title="Бүх багууд" count={total}>
        <Link href="/admin/teams/new" className={BTN}><I n="add" className="text-base" /> Шинэ баг</Link>
      </PageHead>

      <form className="flex flex-wrap items-center gap-2 mb-5" action="/admin/teams">
        <input type="search" name="q" defaultValue={q} placeholder="Нэр, товч нэр, хотоор хайх..." className={`${INP} max-w-xs`} />
        <select name="gender" defaultValue={gender} className={`${INP} max-w-[160px]`}>
          <option value="">Бүх хүйс</option>
          <option value="M">Эрэгтэй</option>
          <option value="F">Эмэгтэй</option>
          <option value="Mixed">Холимог</option>
        </select>
        <button type="submit" className={BTN_GHOST}><I n="search" className="text-base" /> Хайх</button>
      </form>

      {teams.length === 0 ? (
        <Empty icon="groups">Баг олдсонгүй</Empty>
      ) : (
        <div className="overflow-x-auto border border-line rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-[11px] uppercase tracking-wide border-b border-line">
                <th className={`${TH} px-4`}>Баг</th>
                <th className={TH}>Хот</th>
                <th className={TH}>Хүйс</th>
                <th className={`${TH} !text-center`}>Улирал</th>
                <th className={`${TH} !text-center`}>Тоглогч</th>
                <th className="w-24 py-2.5 px-4" />
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => {
                const g = GENDER[t.gender] ?? GENDER.M;
                return (
                  <tr key={t.id} className={TR}>
                    <td className={`${TD} px-4`}>
                      <div className="flex items-center gap-3">
                        <Thumb src={t.logo_path} icon="groups" />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{t.name}</div>
                          {t.short_name && <div className="text-xs text-muted">{t.short_name}</div>}
                        </div>
                      </div>
                    </td>
                    <td className={`${TD} text-ink2`}>{t.city || '—'}</td>
                    <td className={TD}><span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ color: g[1], background: g[1] + '1a' }}>{g[0]}</span></td>
                    <td className={`${TD} text-center text-ink2`}>{t.season_count}</td>
                    <td className={`${TD} text-center text-ink2`}>{t.player_count}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5 justify-end">
                        <Link href={`/admin/teams/${t.id}`} className={ICON_BTN} title="Засах"><I n="edit" className="text-sm" /></Link>
                        <form action={deleteTeam}>
                          <input type="hidden" name="id" value={t.id} />
                          <ConfirmButton message={`"${t.name}" багийг устгах уу?`} className={ICON_BTN_DANGER} title="Устгах">
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
      <Pager page={page} pages={pages} hrefFor={qs} />
    </>
  );
}
