import { notFound, redirect } from 'next/navigation';
import { canManageLeague, requireRole } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { Crumbs } from '@/components/admin/ui';
import ImportClient from './ImportClient';

export const metadata = { title: 'Roster import' };

export default async function ImportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(['admin', 'commissioner']);
  const stid = parseInt((await params).id, 10) || 0;
  const st = await queryOne<{ team_name: string; season_id: number; season_name: string; league_id: number }>(
    'SELECT t.name AS team_name, st.season_id, s.name AS season_name, s.league_id FROM season_teams st JOIN teams t ON t.id=st.team_id JOIN seasons s ON s.id=st.season_id WHERE st.id=?',
    [stid],
  );
  if (!st) notFound();
  if (!canManageLeague(user, st.league_id)) redirect('/admin/forbidden');

  return (
    <>
      <Crumbs items={[['Dashboard', '/admin'], [st.season_name, `/admin/seasons/${st.season_id}?tab=teams`], [st.team_name, `/admin/season-teams/${stid}`], ['Excel import']]} />
      <h1 className="font-display text-2xl uppercase tracking-wide mb-5">Roster import — {st.team_name}</h1>
      <ImportClient stid={stid} back={`/admin/season-teams/${stid}`} />
    </>
  );
}
