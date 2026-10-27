import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import LeagueForm, { type LeagueRow } from '../LeagueForm';

export const metadata = { title: 'Лиг засах' };

export default async function EditLeague({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(['admin']);
  const league = await queryOne<LeagueRow>('SELECT * FROM leagues WHERE id=?', [parseInt((await params).id, 10) || 0]);
  if (!league) notFound();
  return <LeagueForm league={league} />;
}
