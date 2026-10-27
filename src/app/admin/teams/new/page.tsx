import { requireRole } from '@/lib/auth';
import TeamForm from '../TeamForm';

export const metadata = { title: 'Шинэ баг' };

export default async function NewTeam() {
  await requireRole(['admin', 'commissioner']);
  return <TeamForm />;
}
