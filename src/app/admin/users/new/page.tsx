import { requireRole } from '@/lib/auth';
import UserForm from '../UserForm';

export const metadata = { title: 'Шинэ хэрэглэгч' };

export default async function NewUser() {
  await requireRole(['admin']);
  return <UserForm />;
}
