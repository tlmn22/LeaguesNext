import { requireRole } from '@/lib/auth';
import MatchForm from '../MatchForm';

export const metadata = { title: 'Шинэ тоглолт' };

export default async function NewMatch({ searchParams }: { searchParams: Promise<{ season_id?: string }> }) {
  const user = await requireRole(['admin', 'commissioner']);
  const sid = parseInt((await searchParams).season_id ?? '', 10) || 0;
  return <MatchForm user={user} seasonId={sid} />;
}
