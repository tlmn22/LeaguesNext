import Link from 'next/link';
import { query } from '@/lib/db';
import { BTN, BTN_GHOST, Card, Crumbs, I, INP, LBL } from '@/components/admin/ui';
import { Submit } from '@/components/admin/client';
import { changePassword, saveUser } from './actions';

export type UserRow = { id: number; name: string; email: string; role: string; league_id: number | null };

export default async function UserForm({ user }: { user?: UserRow }) {
  const leagues = await query<{ id: number; name: string }>('SELECT id, name FROM leagues ORDER BY name');
  const f = user;
  return (
    <>
      <Crumbs items={[['Dashboard', '/admin'], ['Хэрэглэгчид', '/admin/users'], [f ? f.name : 'Шинэ']]} />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start max-w-5xl">
        <div className="border border-line rounded-lg p-6">
          <h2 className="font-display text-xl uppercase tracking-wide mb-5">{f ? 'Хэрэглэгч засах' : 'Шинэ хэрэглэгч'}</h2>
          <form action={saveUser} className="space-y-5">
            {f && <input type="hidden" name="id" value={f.id} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={LBL}>Нэр <span className="text-live">*</span></label>
                <input type="text" name="name" required defaultValue={f?.name} className={INP} />
              </div>
              <div>
                <label className={LBL}>И-мэйл <span className="text-live">*</span></label>
                <input type="email" name="email" required defaultValue={f?.email} className={INP} autoComplete="off" />
              </div>
            </div>
            {!f && (
              <div>
                <label className={LBL}>Нууц үг <span className="text-live">*</span></label>
                <input type="password" name="password" required minLength={8} className={INP} autoComplete="new-password" placeholder="Хамгийн багадаа 8 тэмдэгт" />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={LBL}>Эрх <span className="text-live">*</span></label>
                <select name="role" defaultValue={f?.role ?? 'commissioner'} className={INP}>
                  <option value="admin">Админ</option>
                  <option value="commissioner">Комиссар</option>
                </select>
              </div>
              <div>
                <label className={LBL}>Лиг <span className="normal-case font-normal">(зөвхөн комиссарт)</span></label>
                <select name="league_id" defaultValue={f?.league_id ?? ''} className={INP}>
                  <option value="">— Сонгох —</option>
                  {leagues.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="border-t border-line pt-5 flex gap-3">
              <Submit className={BTN}><I n="save" className="text-base" /> {f ? 'Хадгалах' : 'Нэмэх'}</Submit>
              <Link href="/admin/users" className={BTN_GHOST}>Цуцлах</Link>
            </div>
          </form>
        </div>
        {f && (
          <Card title="Нууц үг солих">
            <form action={changePassword} className="space-y-4">
              <input type="hidden" name="id" value={f.id} />
              <div>
                <label className={LBL}>Шинэ нууц үг</label>
                <input type="password" name="password" required minLength={8} className={INP} autoComplete="new-password" />
              </div>
              <div>
                <label className={LBL}>Давтах</label>
                <input type="password" name="password_confirm" required minLength={8} className={INP} autoComplete="new-password" />
              </div>
              <Submit className={BTN}><I n="key" className="text-base" /> Солих</Submit>
            </form>
          </Card>
        )}
      </div>
    </>
  );
}
