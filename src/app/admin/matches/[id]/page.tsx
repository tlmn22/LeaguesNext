import { notFound, redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { canMatch } from '@/lib/scope';
import MatchForm, { type MatchRow } from '../MatchForm';

export const metadata = { title: 'Тоглолт засах' };

export default async function EditMatch({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(['admin', 'commissioner']);
  const id = parseInt((await params).id, 10) || 0;
  const match = await queryOne<MatchRow>(
    'SELECT id, season_id, home_season_team_id, away_season_team_id, match_datetime, stage, game_no, arena_name, live_embed_code, status FROM matches WHERE id=?',
    [id],
  );
  if (!match) notFound();
  if (!(await canMatch(user, id))) redirect('/admin/forbidden');
  return <MatchForm user={user} match={match} />;
}
