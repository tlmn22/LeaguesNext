import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import TeamForm, { type TeamRow } from '../TeamForm';

export const metadata = { title: 'Баг засах' };

export default async function EditTeam({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(['admin', 'commissioner']);
  const team = await queryOne<TeamRow>(
    'SELECT id, name, short_name, city, gender, logo_path, primary_color, description FROM teams WHERE id=?',
    [parseInt((await params).id, 10) || 0],
  );
  if (!team) notFound();
  return <TeamForm team={team} />;
}
