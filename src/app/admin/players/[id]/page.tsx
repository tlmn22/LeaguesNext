import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import PlayerForm, { type PlayerRow } from '../PlayerForm';

export const metadata = { title: 'Тоглогч засах' };

export default async function EditPlayer({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(['admin', 'commissioner']);
  const player = await queryOne<PlayerRow>(
    'SELECT id, last_name, first_name, gender, hand, birth_date, height_cm, weight_kg, phone, school_name, photo_path FROM players WHERE id=?',
    [parseInt((await params).id, 10) || 0],
  );
  if (!player) notFound();
  return <PlayerForm player={player} />;
}
