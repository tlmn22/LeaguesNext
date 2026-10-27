import { requireRole } from '@/lib/auth';
import LeagueForm from '../LeagueForm';

export const metadata = { title: 'Шинэ лиг' };

export default async function NewLeague() {
  await requireRole(['admin']);
  return <LeagueForm />;
}
