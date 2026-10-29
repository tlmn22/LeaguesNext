import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { query, scalar } from '@/lib/db';
import { BTN, BTN_GHOST, Crumbs, Empty, I, INP, PageHead } from '@/components/admin/ui';
import MatchTable, { type MatchListRow } from '@/components/admin/MatchTable';
import Pager from '@/components/admin/Pager';

export const metadata = { title: 'Тоглолтууд' };
const PER = 40;

export default async function MatchesAdmin({ searchParams }: { searchParams: Promise<{ season_id?: string; status?: string; q?: string; p?: string }> }) {
  const user = await requireRole(['admin', 'commissioner']);
  const sp = await searchParams;
  const seasonId = parseInt(sp.season_id ?? '', 10) || 0;
  const status = ['scheduled', 'live', 'finished', 'cancelled'].includes(sp.status ?? '') ? sp.status! : '';
  const q = (sp.q ?? '').trim();
  const page = Math.max(1, parseInt(sp.p ?? '1', 10) || 1);

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (user.role === 'commissioner') {
    where.push('s.league_id=?');
    params.push(user.league_id ?? 0);
  }
  if (seasonId) {
    where.push('m.season_id=?');
    params.push(seasonId);
  }
  if (status) {
    where.push('m.status=?');
    params.push(status);
  }
  if (q) {
    where.push('(ht.name ILIKE ? OR at2.name ILIKE ? OR m.arena_name ILIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const FROM = `FROM matches m
    JOIN seasons s ON s.id=m.season_id
    JOIN leagues l ON l.id=s.league_id
    JOIN season_teams hst ON hst.id=m.home_season_team_id
    JOIN season_teams ast ON ast.id=m.away_season_team_id
    JOIN teams ht ON ht.id=hst.team_id
    JOIN teams at2 ON at2.id=ast.team_id`;

  const [seasons, counts, total, matches] = await Promise.all([
    query<{ id: number; name: string; league_name: string }>(
      `SELECT s.id, s.name, l.name AS league_name FROM seasons s JOIN leagues l ON l.id=s.league_id
       ${user.role === 'commissioner' ? 'WHERE s.league_id=?' : ''} ORDER BY l.name, s.created_at DESC`,
      user.role === 'commissioner' ? [user.league_id ?? 0] : [],
    ),
    query<{ status: string; c: number }>(
      `SELECT m.status, COUNT(*) AS c FROM matches m JOIN seasons s ON s.id=m.season_id
       ${user.role === 'commissioner' ? 'WHERE s.league_id=?' : ''}${seasonId ? (user.role === 'commissioner' ? ' AND' : ' WHERE') + ' m.season_id=?' : ''}
       GROUP BY m.status`,
      [...(user.role === 'commissioner' ? [user.league_id ?? 0] : []), ...(seasonId ? [seasonId] : [])],
    ),
    scalar(`SELECT COUNT(*) ${FROM} ${w}`, params),
    query<MatchListRow>(
      `SELECT m.id, m.stage, m.match_datetime, m.arena_name, m.status, m.home_score, m.away_score,
              ht.name AS home_team, ht.logo_path AS home_logo, at2.name AS away_team, at2.logo_path AS away_logo,
              s.name AS season_name, l.name AS league_name,
              (SELECT COUNT(*) FROM match_player_stats mps WHERE mps.match_id=m.id) AS stat_count
       ${FROM} ${w}
       ORDER BY m.match_datetime DESC, m.id DESC LIMIT ? OFFSET ?`,
      [...params, PER, (page - 1) * PER],
    ),
  ]);
  const c = Object.fromEntries(counts.map((r) => [r.status, Number(r.c)]));
  const all = Object.values(c).reduce((a, b) => a + b, 0);
  const qs = (p: number) => `/admin/matches?${new URLSearchParams({ ...(seasonId && { season_id: String(seasonId) }), ...(status && { status }), ...(q && { q }), p: String(p) })}`;
  const back = qs(page);

  return (
    <>
      <Crumbs items={[['Dashboard', '/admin'], ['Тоглолтууд']]} />
      <PageHead title="Тоглолтууд">
        <Link href={`/admin/matches/new${seasonId ? `?season_id=${seasonId}` : ''}`} className={BTN}>
          <I n="add" className="text-base" /> Шинэ тоглолт
        </Link>
      </PageHead>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 max-w-2xl">
        {([['Нийт', all, 'text-primary'], ['Хуваарьт', c.scheduled ?? 0, 'text-reg'], ['Шууд', c.live ?? 0, 'text-live'], ['Дууссан', c.finished ?? 0, 'text-done']] as const).map(([l, v, cl]) => (
          <div key={l} className="p-4 border border-line rounded-xl bg-surface">
            <div className="text-[10px] uppercase tracking-widest text-muted mb-1">{l}</div>
            <div className={`font-display text-2xl ${cl}`}>{v}</div>
          </div>
        ))}
      </div>

      <form className="flex flex-wrap items-center gap-2 mb-5" action="/admin/matches">
        <select name="season_id" defaultValue={seasonId || ''} className={`${INP} max-w-[280px]`}>
          <option value="">Бүх улирал</option>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>{s.league_name} — {s.name}</option>
          ))}
        </select>
        <select name="status" defaultValue={status} className={`${INP} max-w-[160px]`}>
          <option value="">Бүх төлөв</option>
          <option value="scheduled">Хуваарьт</option>
          <option value="live">Шууд</option>
          <option value="finished">Дууссан</option>
          <option value="cancelled">Цуцлагдсан</option>
        </select>
        <input type="search" name="q" defaultValue={q} placeholder="Баг, заалаар хайх..." className={`${INP} max-w-[220px]`} />
        <button type="submit" className={BTN_GHOST}><I n="filter_list" className="text-base" /> Шүүх</button>
      </form>

      {matches.length === 0 ? <Empty icon="sports_basketball">Тоглолт олдсонгүй</Empty> : <MatchTable matches={matches} back={back} showSeason />}
      <Pager page={page} pages={Math.ceil(Number(total ?? 0) / PER)} hrefFor={qs} />
    </>
  );
}
