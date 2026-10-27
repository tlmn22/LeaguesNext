import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { canManageLeague, requireRole } from '@/lib/auth';
import { getMatchHead, loadScoreData } from '@/lib/score';
import { BTN_GHOST, Crumbs, I } from '@/components/admin/ui';
import BoxScoreEditor from '@/components/admin/BoxScoreEditor';
import { addToRoster, removeFromRoster, saveScoreAdmin, searchPlayers, updateJersey } from '../../actions';

export const metadata = { title: 'Дүн / Boxscore' };

export default async function ScorePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(['admin', 'commissioner']);
  const m = await getMatchHead(parseInt((await params).id, 10) || 0);
  if (!m) notFound();
  if (!canManageLeague(user, m.league_id)) redirect('/admin/forbidden');
  const data = await loadScoreData(m);

  return (
    <>
      <Crumbs items={[['Dashboard', '/admin'], ['Тоглолтууд', `/admin/matches?season_id=${m.season_id}`], [`${m.home_team} vs ${m.away_team}`]]} />
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="text-sm text-muted">{m.league_name} · {m.season_name}</div>
        <div className="flex gap-2">
          <Link href={`/admin/matches/${m.id}`} className={BTN_GHOST}><I n="edit" className="text-base" /> Тоглолт засах</Link>
          <a href={`/match/${m.id}`} target="_blank" rel="noopener" className={BTN_GHOST}><I n="open_in_new" className="text-base" /> Сайтад харах</a>
        </div>
      </div>
      <BoxScoreEditor
        match={{
          id: m.id, status: m.status, home_score: m.home_score, away_score: m.away_score, match_datetime: m.match_datetime,
          home_team: m.home_team, away_team: m.away_team, home_logo: m.home_logo, away_logo: m.away_logo,
          home_season_team_id: m.home_season_team_id, away_season_team_id: m.away_season_team_id,
          home_team_id: m.home_team_id, away_team_id: m.away_team_id,
        }}
        initial={data}
        save={saveScoreAdmin}
        tools={{ updateJersey, removePlayer: removeFromRoster, searchPlayers, addPlayer: addToRoster }}
      />
    </>
  );
}
