import Link from 'next/link';
import { fileUrl } from '@/lib/format';
import { BTN, BTN_GHOST, Crumbs, I, INP, LBL } from '@/components/admin/ui';
import { ImageInput, Submit } from '@/components/admin/client';
import { savePlayer } from './actions';

export type PlayerRow = {
  id: number; last_name: string; first_name: string; gender: string; hand: string; birth_date: string | null;
  height_cm: number | null; weight_kg: number | null; phone: string | null; school_name: string | null; photo_path: string | null;
};

export default function PlayerForm({ player }: { player?: PlayerRow }) {
  const f = player;
  return (
    <>
      <Crumbs items={[['Dashboard', '/admin'], ['Тоглогчид', '/admin/players'], [f ? `${f.last_name} ${f.first_name}` : 'Шинэ тоглогч']]} />
      <div className="border border-line rounded-lg p-6 max-w-3xl">
        <h2 className="font-display text-xl uppercase tracking-wide mb-5">{f ? 'Тоглогч засах' : 'Шинэ тоглогч'}</h2>
        <form action={savePlayer} className="space-y-5">
          {f && <input type="hidden" name="id" value={f.id} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={LBL}>Овог <span className="text-live">*</span></label>
              <input type="text" name="last_name" required defaultValue={f?.last_name} className={INP} />
            </div>
            <div>
              <label className={LBL}>Нэр <span className="text-live">*</span></label>
              <input type="text" name="first_name" required defaultValue={f?.first_name} className={INP} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className={LBL}>Хүйс</label>
              <select name="gender" defaultValue={f?.gender ?? 'M'} className={INP}>
                <option value="M">Эрэгтэй</option>
                <option value="F">Эмэгтэй</option>
                <option value="O">Бусад</option>
              </select>
            </div>
            <div>
              <label className={LBL}>Гар</label>
              <select name="hand" defaultValue={f?.hand ?? 'R'} className={INP}>
                <option value="R">Баруун</option>
                <option value="L">Зүүн</option>
              </select>
            </div>
            <div>
              <label className={LBL}>Төрсөн огноо</label>
              <input type="date" name="birth_date" defaultValue={f?.birth_date ?? ''} className={INP} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            <div>
              <label className={LBL}>Өндөр (см)</label>
              <input type="number" name="height_cm" min={100} max={250} defaultValue={f?.height_cm ?? ''} className={INP} placeholder="185" />
            </div>
            <div>
              <label className={LBL}>Жин (кг)</label>
              <input type="number" name="weight_kg" min={30} max={200} defaultValue={f?.weight_kg ?? ''} className={INP} placeholder="80" />
            </div>
            <div>
              <label className={LBL}>Утас</label>
              <input type="text" name="phone" defaultValue={f?.phone ?? ''} className={INP} placeholder="9900-0000" />
            </div>
            <div>
              <label className={LBL}>Сургууль</label>
              <input type="text" name="school_name" defaultValue={f?.school_name ?? ''} className={INP} />
            </div>
          </div>
          <div>
            <label className={LBL}>Зураг</label>
            <ImageInput name="photo" current={f?.photo_path ? fileUrl(f.photo_path) : null} className="h-20 w-20 object-cover rounded-full border border-line mt-2.5" />
          </div>
          <div className="border-t border-line pt-5 flex gap-3">
            <Submit className={BTN}><I n="save" className="text-base" /> {f ? 'Хадгалах' : 'Нэмэх'}</Submit>
            <Link href="/admin/players" className={BTN_GHOST}>Цуцлах</Link>
          </div>
        </form>
      </div>
    </>
  );
}
