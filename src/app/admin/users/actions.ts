'use server';

import { hashPassword, requireRole } from '@/lib/auth';
import { execute, queryOne, scalar } from '@/lib/db';
import { flashRedirect } from '@/lib/flash';
import { int, intOrNull, oneOf, str } from '@/lib/form';

const ROLES = ['admin', 'commissioner'] as const;

export async function saveUser(fd: FormData) {
  await requireRole(['admin']);
  const id = intOrNull(fd, 'id');
  const back = id ? `/admin/users/${id}` : '/admin/users/new';
  const name = str(fd, 'name');
  const email = str(fd, 'email').toLowerCase();
  const role = oneOf(str(fd, 'role'), ROLES, 'commissioner');
  const leagueId = role === 'commissioner' ? intOrNull(fd, 'league_id') : null;
  const password = String(fd.get('password') ?? '');

  if (!name || !email) return flashRedirect('danger', 'Нэр болон и-мэйл заавал шаардлагатай.', back);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return flashRedirect('danger', 'И-мэйл буруу байна.', back);
  if (await scalar('SELECT id FROM users WHERE LOWER(email)=LOWER(?) AND id<>?', [email, id ?? 0])) return flashRedirect('danger', 'Энэ и-мэйл аль хэдийн бүртгэлтэй байна.', back);

  if (id) {
    await execute('UPDATE users SET name=?, email=?, role=?, league_id=?, updated_at=app_now() WHERE id=?', [name, email, role, leagueId, id]);
  } else {
    if (password.length < 8) return flashRedirect('danger', 'Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.', back);
    await execute("INSERT INTO users (name, email, password_hash, role, league_id, status) VALUES (?,?,?,?,?,'active')", [
      name, email, await hashPassword(password), role, leagueId,
    ]);
  }
  // Комиссарын лигийг leagues.commissioner_user_id-тай тааруулна
  if (leagueId && role === 'commissioner') {
    const uid = id ?? (await scalar<number>('SELECT id FROM users WHERE LOWER(email)=LOWER(?)', [email]));
    await execute('UPDATE leagues SET commissioner_user_id=? WHERE id=?', [uid, leagueId]);
  }
  return flashRedirect('success', id ? `"${name}" хэрэглэгчийг заслаа.` : `"${name}" хэрэглэгч нэмэгдлээ.`, '/admin/users');
}

export async function changePassword(fd: FormData) {
  await requireRole(['admin']);
  const id = int(fd, 'id');
  const back = `/admin/users/${id}`;
  const pw = String(fd.get('password') ?? '');
  if (pw.length < 8) return flashRedirect('danger', 'Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.', back);
  if (pw !== String(fd.get('password_confirm') ?? '')) return flashRedirect('danger', 'Нууц үг таарахгүй байна.', back);
  await execute('UPDATE users SET password_hash=?, updated_at=app_now() WHERE id=?', [await hashPassword(pw), id]);
  return flashRedirect('success', 'Нууц үг амжилттай солигдлоо.', back);
}

export async function toggleUser(fd: FormData) {
  const me = await requireRole(['admin']);
  const id = int(fd, 'id');
  if (id === me.id) return flashRedirect('danger', 'Өөрийгөө хааж болохгүй.', '/admin/users');
  const status = str(fd, 'status') === 'active' ? 'active' : 'inactive';
  await execute('UPDATE users SET status=?, updated_at=app_now() WHERE id=?', [status, id]);
  return flashRedirect('success', status === 'active' ? 'Хэрэглэгч идэвхжлээ.' : 'Хэрэглэгчийг хааллаа.', '/admin/users');
}

export async function deleteUser(fd: FormData) {
  const me = await requireRole(['admin']);
  const id = int(fd, 'id');
  if (id === me.id) return flashRedirect('danger', 'Өөрийгөө устгаж болохгүй.', '/admin/users');
  const u = await queryOne<{ name: string }>('SELECT name FROM users WHERE id=?', [id]);
  if (!u) return flashRedirect('danger', 'Хэрэглэгч олдсонгүй.', '/admin/users');
  await execute('UPDATE leagues SET commissioner_user_id=NULL WHERE commissioner_user_id=?', [id]);
  await execute('DELETE FROM users WHERE id=?', [id]);
  return flashRedirect('success', `"${u.name}" хэрэглэгч устгагдлаа.`, '/admin/users');
}
