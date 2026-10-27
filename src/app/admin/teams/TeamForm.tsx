import Link from 'next/link';
import { fileUrl } from '@/lib/format';
import { BTN, BTN_GHOST, Crumbs, I, INP, LBL } from '@/components/admin/ui';
import { ColorInput, ImageInput, Submit } from '@/components/admin/client';
import { saveTeam } from './actions';

export type TeamRow = { id: number; name: string; short_name: string | null; city: string | null; gender: string; logo_path: string | null; primary_color: string | null; description: string | null };

export default function TeamForm({ team }: { team?: TeamRow }) {
  const f = team;
  return (
    <>
      <Crumbs items={[['Dashboard', '/admin'], ['Багууд', '/admin/teams'], [f ? f.name : 'Шинэ баг']]} />
      <div className="border border-line rounded-lg p-6 max-w-3xl">
        <h2 className="font-display text-xl uppercase tracking-wide mb-5">{f ? 'Баг засах' : 'Шинэ баг'}</h2>
        <form action={saveTeam} className="space-y-5">
          {f && <input type="hidden" name="id" value={f.id} />}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-5">
            <div>
              <label className={LBL}>Багийн нэр <span className="text-live">*</span></label>
              <input type="text" name="name" required defaultValue={f?.name} className={INP} placeholder="Жишээ: Eagles" />
            </div>
            <div>
              <label className={LBL}>Товч нэр</label>
              <input type="text" name="short_name" maxLength={10} defaultValue={f?.short_name ?? ''} className={INP} placeholder="EGL" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className={LBL}>Хот</label>
              <input type="text" name="city" defaultValue={f?.city ?? ''} className={INP} placeholder="Улаанбаатар" />
            </div>
            <div>
              <label className={LBL}>Хүйс <span className="text-live">*</span></label>
              <select name="gender" defaultValue={f?.gender ?? 'M'} className={INP}>
                <option value="M">Эрэгтэй</option>
                <option value="F">Эмэгтэй</option>
                <option value="Mixed">Холимог</option>
              </select>
            </div>
            <div>
              <label className={LBL}>Өнгө</label>
              <ColorInput name="primary_color" defaultValue={f?.primary_color || '#E8601C'} />
            </div>
          </div>
          <div>
            <label className={LBL}>Тайлбар</label>
            <textarea name="description" rows={2} defaultValue={f?.description ?? ''} className={`${INP} resize-y`} />
          </div>
          <div>
            <label className={LBL}>Лого</label>
            <ImageInput name="logo" current={f?.logo_path ? fileUrl(f.logo_path) : null} />
          </div>
          <div className="border-t border-line pt-5 flex gap-3">
            <Submit className={BTN}><I n="save" className="text-base" /> {f ? 'Хадгалах' : 'Нэмэх'}</Submit>
            <Link href="/admin/teams" className={BTN_GHOST}>Цуцлах</Link>
          </div>
        </form>
      </div>
    </>
  );
}
