import { requireRole } from '@/lib/auth';
import SeasonForm from '../SeasonForm';

export const metadata = { title: 'Шинэ улирал' };

export default async function NewSeason() {
  const user = await requireRole(['admin', 'commissioner']);
  return <SeasonForm user={user} />;
}
