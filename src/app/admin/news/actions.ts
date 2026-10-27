'use server';

import { revalidatePath } from 'next/cache';
import { isAdmin, requireRole, type User } from '@/lib/auth';
import { execute, queryOne, scalar } from '@/lib/db';
import { flashRedirect } from '@/lib/flash';
import { int, intOrNull, oneOf, str } from '@/lib/form';
import { canSeason } from '@/lib/scope';
import { UploadError, deleteUpload, saveImage } from '@/lib/upload';

const STATUSES = ['draft', 'published'] as const;

/** Admin бүх мэдээг, commissioner зөвхөн өөрийн лигийн улиралд холбогдсон мэдээг удирдана */
async function canNews(u: User, seasonId: number | null) {
  if (isAdmin(u)) return true;
  return seasonId != null && (await canSeason(u, seasonId));
}

export async function saveNews(fd: FormData) {
  const user = await requireRole(['admin', 'commissioner']);
  const id = intOrNull(fd, 'id');
  const back = id ? `/admin/news/${id}` : '/admin/news/new';

  const title = str(fd, 'title').slice(0, 255);
  const seasonId = intOrNull(fd, 'season_id');
  const excerpt = str(fd, 'excerpt') || null;
  const content = str(fd, 'content') || null;
  const status = oneOf(str(fd, 'status'), STATUSES, 'draft');
  const dtRaw = str(fd, 'published_at');
  const publishedAt = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dtRaw) ? dtRaw.replace('T', ' ').slice(0, 16) + ':00' : null;

  if (!title) return flashRedirect('danger', 'Гарчиг заавал шаардлагатай.', back);
  if (!isAdmin(user) && !seasonId) return flashRedirect('danger', 'Улирал сонгоно уу.', back);
  if (seasonId && !(await scalar('SELECT id FROM seasons WHERE id=?', [seasonId]))) return flashRedirect('danger', 'Улирал олдсонгүй.', back);
  if (!(await canNews(user, seasonId))) return flashRedirect('danger', 'Эрхгүй.', '/admin/news');

  let cover: string | null;
  try {
    cover = await saveImage(fd.get('cover_image'), 'news', 'news');
  } catch (e) {
    if (e instanceof UploadError) return flashRedirect('danger', e.message, back);
    throw e;
  }

  if (id) {
    const old = await queryOne<{ season_id: number | null; cover_image: string | null }>('SELECT season_id, cover_image FROM news WHERE id=?', [id]);
    if (!old) return flashRedirect('danger', 'Мэдээ олдсонгүй.', '/admin/news');
    if (!(await canNews(user, old.season_id))) return flashRedirect('danger', 'Эрхгүй.', '/admin/news');
    // Огноо оруулаагүй бол анх нийтлэх үед одоогийн цагийг тавина
    await execute(
      `UPDATE news SET title=?, season_id=?, excerpt=?, content=?, status=?,
         published_at=COALESCE(?::timestamp, published_at, CASE WHEN ?='published' THEN app_now() END)${cover ? ', cover_image=?' : ''}
       WHERE id=?`,
      cover
        ? [title, seasonId, excerpt, content, status, publishedAt, status, cover, id]
        : [title, seasonId, excerpt, content, status, publishedAt, status, id],
    );
    if (cover) await deleteUpload(old.cover_image);
  } else {
    await execute(
      `INSERT INTO news (title, season_id, excerpt, content, status, cover_image, created_by, published_at)
       VALUES (?,?,?,?,?,?,?, COALESCE(?::timestamp, CASE WHEN ?='published' THEN app_now() END))`,
      [title, seasonId, excerpt, content, status, cover, user.id, publishedAt, status],
    );
  }

  revalidatePath('/', 'layout');
  return flashRedirect('success', id ? `"${title}" мэдээг заслаа.` : `"${title}" мэдээ нэмэгдлээ.`, '/admin/news');
}

export async function deleteNews(fd: FormData) {
  const user = await requireRole(['admin', 'commissioner']);
  const id = int(fd, 'id');
  const n = await queryOne<{ title: string; season_id: number | null; cover_image: string | null }>('SELECT title, season_id, cover_image FROM news WHERE id=?', [id]);
  if (!n) return flashRedirect('danger', 'Мэдээ олдсонгүй.', '/admin/news');
  if (!(await canNews(user, n.season_id))) return flashRedirect('danger', 'Эрхгүй.', '/admin/news');
  await execute('DELETE FROM news WHERE id=?', [id]);
  await deleteUpload(n.cover_image);
  revalidatePath('/', 'layout');
  return flashRedirect('success', `"${n.title}" мэдээ устгагдлаа.`, '/admin/news');
}
