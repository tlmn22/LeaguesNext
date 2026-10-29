import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { query, scalar } from '@/lib/db';
import { fmtDate } from '@/lib/format';
import { Pill, StatTile, TH, TD, TR } from '@/components/admin/ui';

export const metadata = { title: 'Dashboard' };

const C = { orange: '#F2743A', blue: '#5b9bdd', green: '#3fb173', purple: '#a78bfa' };

type Recent = { id: number; status: string; home_score: number; away_score: number; match_datetime: string; home_team: string; away_team: string; season_name: string };

const MATCH_JOIN = `
  JOIN season_teams hst ON hst.id=m.home_season_team_id
  JOIN season_teams ast ON ast.id=m.away_season_team_id
  JOIN teams ht ON ht.id=hst.team_id
  JOIN teams at2 ON at2.id=ast.team_id`;

export default async function Dashboard() {
  const user = await requireUser();

  const isAdm = user.role === 'admin';
  const lid = user.league_id ?? 0;
  const lgWhere = isAdm ? '' : 'WHERE s.league_id=?';
  const lgP = isAdm ? [] : [lid];

  const [tiles, recent] = await Promise.all([
    isAdm
      ? Promise.all([
          scalar('SELECT COUNT(*) FROM leagues'),
          scalar('SELECT COUNT(*) FROM matches'),
          scalar("SELECT COUNT(*) FROM matches WHERE status='finished'"),
          scalar('SELECT COUNT(*) FROM players'),
          scalar('SELECT COUNT(*) FROM seasons'),
        ])
      : Promise.all([
          scalar('SELECT COUNT(*) FROM seasons WHERE league_id=?', [lid]),
          scalar('SELECT COUNT(*) FROM matches m JOIN seasons s ON s.id=m.season_id WHERE s.league_id=?', [lid]),
          scalar("SELECT COUNT(*) FROM matches m JOIN seasons s ON s.id=m.season_id WHERE s.league_id=? AND m.status='finished'", [lid]),
          scalar("SELECT COUNT(*) FROM matches m JOIN seasons s ON s.id=m.season_id WHERE s.league_id=? AND m.status='scheduled'", [lid]),
          Promise.resolve(0),
        ]),
    query<Recent>(
      `SELECT m.id, m.status, m.home_score, m.away_score, m.match_datetime, ht.name AS home_team, at2.name AS away_team, s.name AS season_name
       FROM matches m JOIN seasons s ON s.id=m.season_id ${MATCH_JOIN} ${lgWhere}
       ORDER BY m.updated_at DESC LIMIT 8`,
      lgP,
    ),
  ]);

  return (
    <>
      <h1 className="font-display text-2xl uppercase tracking-wide mb-5">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isAdm ? (
          <>
            <StatTile label="Нийт лиг" value={tiles[0] ?? 0} icon="emoji_events" color={C.orange} />
            <StatTile label="Нийт тоглолт" value={tiles[1] ?? 0} icon="sports_basketball" color={C.blue} sub={`${tiles[2] ?? 0} дууссан`} />
            <StatTile label="Тоглогчид" value={tiles[3] ?? 0} icon="directions_run" color={C.green} />
            <StatTile label="Улирал" value={tiles[4] ?? 0} icon="calendar_month" color={C.purple} />
          </>
        ) : (
          <>
            <StatTile label="Улирал" value={tiles[0] ?? 0} icon="calendar_month" color={C.orange} />
            <StatTile label="Нийт тоглолт" value={tiles[1] ?? 0} icon="sports_basketball" color={C.blue} sub={`${tiles[2] ?? 0} дууссан`} />
            <StatTile label="Хуваарьт" value={tiles[3] ?? 0} icon="schedule" color={C.green} />
          </>
        )}
      </div>

      <div>
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-[13px] uppercase tracking-[0.14em] text-muted">Сүүлийн тоглолтууд</h2>
            <Link href="/admin/matches" className="text-[12px] font-medium text-primary-ink hover:text-primary">Бүгдийг харах →</Link>
          </div>
          {recent.length === 0 ? (
            <div className="text-center py-14 text-muted text-sm border border-line rounded-xl bg-surface">Тоглолт байхгүй</div>
          ) : (
            <div className="overflow-x-auto border border-line rounded-xl bg-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted text-[11px] uppercase tracking-wide border-b border-line">
                    <th className={`${TH} px-4`}>Тоглолт</th>
                    <th className={TH}>Улирал</th>
                    <th className={TH}>Огноо</th>
                    <th className={`${TH} !text-center`}>Дүн</th>
                    <th className={`${TH} px-4`}>Төлөв</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((m) => (
                    <tr key={m.id} className={TR}>
                      <td className={`${TD} px-4 font-medium whitespace-nowrap`}>
                        <Link href={`/admin/matches/${m.id}/score`} className="hover:text-primary">
                          {m.home_team} <span className="text-muted font-normal">vs</span> {m.away_team}
                        </Link>
                      </td>
                      <td className={`${TD} text-ink2 whitespace-nowrap`}>{m.season_name}</td>
                      <td className={`${TD} text-ink2 whitespace-nowrap`}>{fmtDate(m.match_datetime, 'd.m H:i')}</td>
                      <td className={`${TD} text-center font-display text-base whitespace-nowrap`}>
                        {m.status === 'finished' ? `${m.home_score} — ${m.away_score}` : <span className="text-muted">—</span>}
                      </td>
                      <td className={`${TD} px-4`}><Pill status={m.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
