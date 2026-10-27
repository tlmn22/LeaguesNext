import { notFound, redirect } from 'next/navigation';
import { isAdmin, requireRole } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { canSeason } from '@/lib/scope';
import NewsForm, { type NewsRow } from '../NewsForm';

export const metadata = { title: 'Мэдээ засах' };

export default async function EditNews({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(['admin', 'commissioner']);
  const news = await queryOne<NewsRow>('SELECT * FROM news WHERE id=?', [parseInt((await params).id, 10) || 0]);
  if (!news) notFound();
  if (!isAdmin(user) && !(news.season_id && (await canSeason(user, news.season_id)))) redirect('/admin/forbidden');
  return <NewsForm user={user} news={news} />;
}
