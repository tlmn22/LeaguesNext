import Link from 'next/link';
import { requireRole, roleLabel } from '@/lib/auth';
import { query } from '@/lib/db';
import { fmtDate } from '@/lib/format';
import { BTN, Crumbs, ICON_BTN, ICON_BTN_DANGER, I, PageHead, Pill, TH, TD, TR } from '@/components/admin/ui';
import { ConfirmButton } from '@/components/admin/client';
import { deleteUser, toggleUser } from './actions';

export const metadata = { title: 'Хэрэглэгчид' };

const ROLE_COLOR: Record<string, string> = { admin: '#F2743A', commissioner: '#5b9bdd' };

export default async function UsersAdmin() {
  const me = await requireRole(['admin']);
  const users = await query<{ id: number; name: string; email: string; role: string; status: string; league_name: string | null; created_at: string }>(
    'SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, l.name AS league_name FROM users u LEFT JOIN leagues l ON l.id=u.league_id ORDER BY u.role, u.name',
  );

  return (
    <>
      <Crumbs items={[['Dashboard', '/admin'], ['Хэрэглэгчид']]} />
      <PageHead title="Хэрэглэгчид" count={users.length}>
        <Link href="/admin/users/new" className={BTN}><I n="person_add" className="text-base" /> Шинэ хэрэглэгч</Link>
      </PageHead>
      <div className="overflow-x-auto border border-line rounded-xl bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted text-[11px] uppercase tracking-wide border-b border-line">
              <th className={`${TH} px-4`}>Нэр</th>
              <th className={TH}>И-мэйл</th>
              <th className={TH}>Эрх</th>
              <th className={TH}>Лиг</th>
              <th className={TH}>Төлөв</th>
              <th className={TH}>Үүсгэсэн</th>
              <th className="w-32 py-2.5 px-4" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const c = ROLE_COLOR[u.role] ?? '#75798c';
              return (
                <tr key={u.id} className={TR}>
                  <td className={`${TD} px-4 font-medium`}>{u.name}{u.id === me.id && <span className="ml-1.5 text-[10px] text-muted">(та)</span>}</td>
                  <td className={`${TD} text-ink2`}>{u.email}</td>
                  <td className={TD}><span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ color: c, background: c + '1a' }}>{roleLabel(u.role)}</span></td>
                  <td className={`${TD} text-ink2`}>{u.league_name ?? '—'}</td>
                  <td className={TD}><Pill status={u.status} /></td>
                  <td className={`${TD} text-muted whitespace-nowrap`}>{fmtDate(u.created_at, 'd.m.Y')}</td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-1.5 justify-end">
                      <Link href={`/admin/users/${u.id}`} className={ICON_BTN} title="Засах"><I n="edit" className="text-sm" /></Link>
                      {u.id !== me.id && (
                        <>
                          <form action={toggleUser}>
                            <input type="hidden" name="id" value={u.id} />
                            <input type="hidden" name="status" value={u.status === 'active' ? 'inactive' : 'active'} />
                            <ConfirmButton message={u.status === 'active' ? `${u.name}-г хаах уу?` : `${u.name}-г идэвхжүүлэх үү?`} className={ICON_BTN} title={u.status === 'active' ? 'Хаах' : 'Идэвхжүүлэх'}>
                              <I n={u.status === 'active' ? 'block' : 'check_circle'} className="text-sm" />
                            </ConfirmButton>
                          </form>
                          <form action={deleteUser}>
                            <input type="hidden" name="id" value={u.id} />
                            <ConfirmButton message={`${u.name}-г устгах уу?`} className={ICON_BTN_DANGER} title="Устгах">
                              <I n="delete" className="text-sm" />
                            </ConfirmButton>
                          </form>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
