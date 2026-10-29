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
  const teams = await query<{
    id: number; name: string; short_name: string | null; city: string | null; gender: string; logo_path: string | null; primary_color: string | null;
    season_count: number; player_count: number; league: string | null; season: string | null; roster: number | null;
  }>(
    `SELECT t.id, t.name, t.short_name, t.city, t.gender, t.logo_path, t.primary_color,
            (SELECT COUNT(*) FROM season_teams st WHERE st.team_id=t.id) AS season_count,
            (SELECT COUNT(DISTINCT tsr.player_id) FROM team_season_roster tsr WHERE tsr.team_id=t.id) AS player_count,
            cur.league, cur.season, cur.roster
     FROM teams t
     -- Хамгийн сүүлд оролцсон лиг, улирал ба тэр улирлын идэвхтэй roster
     LEFT JOIN LATERAL (
       SELECT l.name AS league, s.name AS season,
              (SELECT COUNT(*) FROM team_season_roster tsr WHERE tsr.season_team_id=st.id AND tsr.status='active') AS roster
       FROM season_teams st JOIN seasons s ON s.id=st.season_id JOIN leagues l ON l.id=s.league_id
       WHERE st.team_id=t.id ORDER BY s.id DESC LIMIT 1
     ) cur ON true
     ${w} ORDER BY t.name ASC LIMIT ? OFFSET ?`,
    [...params, PER, (page - 1) * PER],
  );
  const pages = Math.ceil(total / PER);
  const first = (page - 1) * PER;
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
        <>
        <div className="text-sm text-muted mb-2.5">
          <span className="text-ink font-semibold tabular-nums">{first + 1}–{first + teams.length}</span> / нийт {total}
        </div>
        <div className="overflow-x-auto border border-line rounded-xl bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-[11px] uppercase tracking-wide border-b border-line">
                <th className={`${TH} pl-4 !pr-1 w-12 !text-right`}>#</th>
                <th className={TH}>Баг</th>
                <th className={TH}>Хот</th>
                <th className={TH}>Хүйс</th>
                <th className={TH}>Өнгө</th>
                <th className={`${TH} !text-center`} title="Хамгийн сүүлийн улирлын идэвхтэй тоглогч">Roster</th>
                <th className={`${TH} !text-center`}>Улирал</th>
                <th className={`${TH} !text-center`} title="Бүх улирлын нийт тоглогч">Нийт тоглогч</th>
                <th className="w-24 py-2.5 px-4" />
              </tr>
            </thead>
            <tbody>
              {teams.map((t, i) => {
                const g = GENDER[t.gender] ?? GENDER.M;
                const meta = [t.short_name, t.league && `${t.league} · ${t.season}`].filter(Boolean).join(' · ');
                return (
                  <tr key={t.id} className={TR}>
                    <td className={`${TD} pl-4 !pr-1 text-right text-muted tabular-nums`}>{first + i + 1}</td>
                    <td className={TD}>
                      <Link href={`/admin/teams/${t.id}`} className="flex items-center gap-3 group">
                        <Thumb src={t.logo_path} icon="groups" className="w-10 h-10 rounded-lg" />
                        <div className="min-w-0">
                          <div className="font-semibold truncate group-hover:text-primary-ink transition-colors">{t.name}</div>
                          <div className="text-xs text-muted truncate max-w-[300px]">{meta || 'Улиралд оролцоогүй'}</div>
                        </div>
                      </Link>
                    </td>
                    <td className={`${TD} text-ink2`}>{t.city || '—'}</td>
                    <td className={TD}><span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: g[1], background: g[1] + '1a' }}>{g[0]}</span></td>
                    <td className={TD}>
                      {t.primary_color ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-ink2 font-mono">
                          <span className="w-4 h-4 rounded-full border border-line2" style={{ background: t.primary_color }} />
                          {t.primary_color.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className={`${TD} text-center tabular-nums ${t.roster ? 'font-semibold' : 'text-muted'}`}>{t.roster ?? '—'}</td>
                    <td className={`${TD} text-center text-ink2 tabular-nums`}>{t.season_count}</td>
                    <td className={`${TD} text-center text-ink2 tabular-nums`}>{t.player_count}</td>
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
        </>
      )}
      <Pager page={page} pages={pages} hrefFor={qs} />
    </>
  );
}
