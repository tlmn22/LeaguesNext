import { requireRole } from '@/lib/auth';
import NewsForm from '../NewsForm';

export const metadata = { title: 'Шинэ мэдээ' };

export default async function NewNews() {
  const user = await requireRole(['admin', 'commissioner']);
  return <NewsForm user={user} />;
}
