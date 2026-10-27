import { notFound, redirect } from 'next/navigation';
import { canManageLeague, requireRole } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import SeasonForm, { type SeasonRow } from '../../SeasonForm';

export const metadata = { title: 'Улирал засах' };

export default async function EditSeason({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(['admin', 'commissioner']);
  const season = await queryOne<SeasonRow>('SELECT * FROM seasons WHERE id=?', [parseInt((await params).id, 10) || 0]);
  if (!season) notFound();
  if (!canManageLeague(user, season.league_id)) redirect('/admin/forbidden');
  return <SeasonForm user={user} season={season} />;
}
