import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { fmtDate } from '@/lib/format';
import { BTN, BTN_GHOST, Crumbs, Empty, GENDER, ICON_BTN, ICON_BTN_DANGER, I, INP, PageHead, TH, TD, TR, Thumb } from '@/components/admin/ui';
import { ConfirmButton } from '@/components/admin/client';
import Pager from '@/components/admin/Pager';
import { deletePlayer } from './actions';

export const metadata = { title: 'Тоглогчид' };
const PER = 30;

export default async function PlayersAdmin({ searchParams }: { searchParams: Promise<{ q?: string; gender?: string; p?: string }> }) {
  await requireRole(['admin', 'commissioner']);
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const gender = ['M', 'F', 'O'].includes(sp.gender ?? '') ? sp.gender! : '';
  const page = Math.max(1, parseInt(sp.p ?? '1', 10) || 1);

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (q) {
    where.push("(CONCAT(p.last_name,' ',p.first_name) ILIKE ? OR CONCAT(p.first_name,' ',p.last_name) ILIKE ? OR p.phone ILIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (gender) {
    where.push('p.gender=?');
    params.push(gender);
  }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const [counts, players] = await Promise.all([
    queryOne<{ total: number; m: number; f: number }>(
      `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE p.gender='M') AS m, COUNT(*) FILTER (WHERE p.gender='F') AS f FROM players p ${w}`,
      params,
    ),
    query<{ id: number; last_name: string; first_name: string; gender: string; birth_date: string | null; height_cm: number | null; weight_kg: number | null; phone: string | null; photo_path: string | null; season_count: number }>(
      `SELECT p.id, p.last_name, p.first_name, p.gender, p.birth_date, p.height_cm, p.weight_kg, p.phone, p.photo_path,
              (SELECT COUNT(DISTINCT tsr.season_team_id) FROM team_season_roster tsr WHERE tsr.player_id=p.id) AS season_count
       FROM players p ${w} ORDER BY p.last_name, p.first_name LIMIT ? OFFSET ?`,
      [...params, PER, (page - 1) * PER],
    ),
  ]);
  const total = Number(counts?.total ?? 0);
  const qs = (p: number) => `/admin/players?${new URLSearchParams({ ...(q && { q }), ...(gender && { gender }), p: String(p) })}`;

  return (
    <>
      <Crumbs items={[['Dashboard', '/admin'], ['Тоглогчид']]} />
      <PageHead title="Тоглогчид">
        <Link href="/admin/players/new" className={BTN}><I n="add" className="text-base" /> Шинэ тоглогч</Link>
      </PageHead>

      <div className="grid grid-cols-3 gap-4 mb-6 max-w-lg">
        {([['Нийт', total, 'text-primary'], ['Эрэгтэй', Number(counts?.m ?? 0), 'text-reg'], ['Эмэгтэй', Number(counts?.f ?? 0), 'text-live']] as const).map(([l, v, c]) => (
          <div key={l} className="p-4 border border-line rounded-lg">
            <div className="text-[10px] uppercase tracking-widest text-muted mb-1">{l}</div>
            <div className={`font-display text-2xl ${c}`}>{v}</div>
          </div>
        ))}
      </div>

      <form className="flex flex-wrap items-center gap-2 mb-5" action="/admin/players">
        <input type="search" name="q" defaultValue={q} placeholder="Овог, нэр, утсаар хайх..." className={`${INP} max-w-xs`} />
        <select name="gender" defaultValue={gender} className={`${INP} max-w-[160px]`}>
          <option value="">Бүх хүйс</option>
          <option value="M">Эрэгтэй</option>
          <option value="F">Эмэгтэй</option>
          <option value="O">Бусад</option>
        </select>
        <button type="submit" className={BTN_GHOST}><I n="search" className="text-base" /> Хайх</button>
      </form>

      {players.length === 0 ? (
        <Empty icon="person">Тоглогч олдсонгүй</Empty>
      ) : (
        <div className="overflow-x-auto border border-line rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-[11px] uppercase tracking-wide border-b border-line">
                <th className={`${TH} px-4`}>Тоглогч</th>
                <th className={TH}>Хүйс</th>
                <th className={TH}>Төрсөн</th>
                <th className={TH}>Өндөр / Жин</th>
                <th className={TH}>Утас</th>
                <th className={`${TH} !text-center`}>Улирал</th>
                <th className="w-28 py-2.5 px-4" />
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const g = GENDER[p.gender] ?? GENDER.O;
                return (
                  <tr key={p.id} className={TR}>
                    <td className={`${TD} px-4`}>
                      <div className="flex items-center gap-3">
                        <Thumb src={p.photo_path} icon="person" className="w-9 h-9 rounded-full" />
                        <div className="font-medium">{p.last_name} {p.first_name}</div>
                      </div>
                    </td>
                    <td className={TD}><span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ color: g[1], background: g[1] + '1a' }}>{g[0]}</span></td>
                    <td className={`${TD} text-ink2 whitespace-nowrap`}>{fmtDate(p.birth_date, 'Y.m.d')}</td>
                    <td className={`${TD} text-ink2 whitespace-nowrap`}>{p.height_cm ? `${p.height_cm}см` : '—'}{p.weight_kg ? ` / ${p.weight_kg}кг` : ''}</td>
                    <td className={`${TD} text-ink2 whitespace-nowrap`}>{p.phone || '—'}</td>
                    <td className={`${TD} text-center text-ink2`}>{p.season_count}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5 justify-end">
                        <a href={`/player/${p.id}`} target="_blank" rel="noopener" className={ICON_BTN} title="Сайтад харах"><I n="open_in_new" className="text-sm" /></a>
                        <Link href={`/admin/players/${p.id}`} className={ICON_BTN} title="Засах"><I n="edit" className="text-sm" /></Link>
                        <form action={deletePlayer}>
                          <input type="hidden" name="id" value={p.id} />
                          <ConfirmButton message={`${p.last_name} ${p.first_name}-г устгах уу?`} className={ICON_BTN_DANGER} title="Устгах">
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
      <Pager page={page} pages={Math.ceil(total / PER)} hrefFor={qs} />
    </>
  );
}
