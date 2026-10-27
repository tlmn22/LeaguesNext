import { requireRole } from '@/lib/auth';
import PlayerForm from '../PlayerForm';

export const metadata = { title: 'Шинэ тоглогч' };

export default async function NewPlayer() {
  await requireRole(['admin', 'commissioner']);
  return <PlayerForm />;
}
