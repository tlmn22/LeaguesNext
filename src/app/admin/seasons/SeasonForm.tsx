import Link from 'next/link';
import type { User } from '@/lib/auth';
import { query } from '@/lib/db';
import { fmtDate } from '@/lib/format';
import { BTN, BTN_GHOST, Card, Crumbs, I, INP, LBL } from '@/components/admin/ui';
import { Submit } from '@/components/admin/client';
import { saveSeason } from './actions';

export type SeasonRow = { id: number; league_id: number; name: string; description: string | null; start_date: string | null; end_date: string | null; status: string; created_at: string };

export default async function SeasonForm({ user, season }: { user: User; season?: SeasonRow }) {
  const isAdm = user.role === 'admin';
  const leagues = isAdm
    ? await query<{ id: number; name: string }>('SELECT id, name FROM leagues ORDER BY name')
    : await query<{ id: number; name: string }>('SELECT id, name FROM leagues WHERE id=?', [user.league_id ?? 0]);
  const f = season;

  return (
    <>
      <Crumbs items={[['Dashboard', '/admin'], ['Улирал', '/admin/seasons'], [f ? f.name : 'Шинэ']]} />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="border border-line rounded-xl bg-surface p-6">
          <h2 className="font-display text-xl uppercase tracking-wide mb-5">{f ? 'Улирал засах' : 'Шинэ улирал'}</h2>
          <form action={saveSeason} className="space-y-5">
            {f && <input type="hidden" name="id" value={f.id} />}
            <div>
              <label className={LBL}>Лиг <span className="text-live">*</span></label>
              <select name="league_id" className={INP} defaultValue={f?.league_id ?? (isAdm ? '' : user.league_id ?? '')} required disabled={!isAdm}>
                <option value="">— Сонгох —</option>
                {leagues.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LBL}>Улирлын нэр <span className="text-live">*</span></label>
              <input type="text" name="name" className={INP} defaultValue={f?.name} required placeholder="Жишээ: 2025-2026 Улирал" />
            </div>
            <div>
              <label className={LBL}>Тайлбар</label>
              <textarea name="description" rows={3} className={`${INP} resize-y`} defaultValue={f?.description ?? ''} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className={LBL}>Эхлэх огноо</label>
                <input type="date" name="start_date" className={INP} defaultValue={f?.start_date ?? ''} />
              </div>
              <div>
                <label className={LBL}>Дуусах огноо</label>
                <input type="date" name="end_date" className={INP} defaultValue={f?.end_date ?? ''} />
              </div>
              <div>
                <label className={LBL}>Статус</label>
                <select name="status" className={INP} defaultValue={f?.status ?? 'active'}>
                  <option value="registration">Бүртгэл</option>
                  <option value="active">Идэвхтэй</option>
                  <option value="finished">Дууссан</option>
                </select>
              </div>
            </div>
            <div className="border-t border-line pt-5 flex gap-3">
              <Submit className={BTN}>
                <I n="save" className="text-base" /> {f ? 'Хадгалах' : 'Нэмэх'}
              </Submit>
              <Link href="/admin/seasons" className={BTN_GHOST}>Цуцлах</Link>
            </div>
          </form>
        </div>
        {f && (
          <div className="space-y-5">
            <Card title="Мэдээлэл">
              <div className="text-sm text-muted space-y-1.5">
                <div>ID: <span className="text-ink font-medium">{f.id}</span></div>
                <div>Үүсгэсэн: <span className="text-ink font-medium">{fmtDate(f.created_at, 'd.m.Y H:i')}</span></div>
              </div>
            </Card>
            <Card title="Холбоос">
              <div className="flex flex-col gap-2">
                <Link href={`/admin/seasons/${f.id}?tab=teams`} className={BTN_GHOST}><I n="groups" className="text-base" /> Багууд</Link>
                <Link href={`/admin/seasons/${f.id}?tab=matches`} className={BTN_GHOST}><I n="sports_basketball" className="text-base" /> Тоглолтууд</Link>
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
