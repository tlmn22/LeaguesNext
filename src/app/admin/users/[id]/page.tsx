import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import UserForm, { type UserRow } from '../UserForm';

export const metadata = { title: 'Хэрэглэгч засах' };

export default async function EditUser({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(['admin']);
  const user = await queryOne<UserRow>('SELECT id, name, email, role, league_id FROM users WHERE id=?', [parseInt((await params).id, 10) || 0]);
  if (!user) notFound();
  return <UserForm user={user} />;
}
