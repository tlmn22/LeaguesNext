import Link from 'next/link';
import { isAdmin, type User } from '@/lib/auth';
import { query } from '@/lib/db';
import { fmtDate } from '@/lib/format';
import { BTN, BTN_GHOST, Card, Crumbs, I, INP, LBL } from '@/components/admin/ui';
import { ImageInput, Submit } from '@/components/admin/client';
import { saveNews } from './actions';

export type NewsRow = {
  id: number; title: string; season_id: number | null; excerpt: string | null; content: string | null;
  cover_image: string | null; status: string; published_at: string | null; created_at: string; updated_at: string;
};

export default async function NewsForm({ user, news }: { user: User; news?: NewsRow }) {
  const admin = isAdmin(user);
  const seasons = await query<{ id: number; name: string; league_name: string }>(
    `SELECT s.id, s.name, l.name AS league_name FROM seasons s JOIN leagues l ON l.id=s.league_id
     ${admin ? '' : 'WHERE s.league_id=?'} ORDER BY l.name, s.id DESC`,
    admin ? [] : [user.league_id ?? 0],
  );
  const f = news;

  return (
    <>
      <Crumbs items={[['Dashboard', '/admin'], ['Мэдээ', '/admin/news'], [f ? f.title : 'Шинэ мэдээ']]} />
      <form action={saveNews} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {f && <input type="hidden" name="id" value={f.id} />}
        <div className="border border-line rounded-lg p-6 space-y-5">
          <h2 className="font-display text-xl uppercase tracking-wide">{f ? 'Мэдээ засах' : 'Шинэ мэдээ'}</h2>
          <div>
            <label className={LBL}>Гарчиг <span className="text-live">*</span></label>
            <input type="text" name="title" className={INP} defaultValue={f?.title} required maxLength={255} placeholder="Мэдээний гарчиг" />
          </div>
          <div>
            <label className={LBL}>Товч тайлбар</label>
            <textarea name="excerpt" rows={2} className={`${INP} resize-y`} defaultValue={f?.excerpt ?? ''} placeholder="Жагсаалтад харагдах 1-2 өгүүлбэр. Хоосон бол агуулгын эхнээс авна." />
          </div>
          <div>
            <label className={LBL}>Агуулга</label>
            <textarea name="content" rows={16} className={`${INP} resize-y leading-relaxed`} defaultValue={f?.content ?? ''} placeholder="Догол мөрүүдийг хоосон мөрөөр тусгаарлана." />
          </div>
          <div className="border-t border-line pt-5 flex gap-3 flex-wrap">
            <Submit className={BTN}>
              <I n="save" className="text-base" /> {f ? 'Хадгалах' : 'Нэмэх'}
            </Submit>
            <Link href="/admin/news" className={BTN_GHOST}>Цуцлах</Link>
          </div>
        </div>

        <div className="space-y-5">
          <Card title="Нийтлэх">
            <div className="space-y-4">
              <div>
                <label className={LBL}>Төлөв</label>
                <select name="status" className={INP} defaultValue={f?.status === 'published' ? 'published' : 'draft'}>
                  <option value="draft">Ноорог</option>
                  <option value="published">Нийтлэгдсэн</option>
                </select>
              </div>
              <div>
                <label className={LBL}>Нийтлэх огноо</label>
                <input type="datetime-local" name="published_at" className={INP} defaultValue={f?.published_at ? fmtDate(f.published_at, 'Y-m-dTH:i') : ''} />
                <p className="text-xs text-muted mt-1.5">Хоосон бол нийтлэх үеийн цаг. Ирээдүйн огноо тавибал тэр үед харагдана.</p>
              </div>
              <div>
                <label className={LBL}>Лиг / Улирал {admin ? '' : <span className="text-live">*</span>}</label>
                <select name="season_id" className={INP} defaultValue={f?.season_id ?? ''} required={!admin}>
                  <option value="">{admin ? '— Ерөнхий мэдээ —' : '— Сонгох —'}</option>
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>{s.league_name} · {s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>
          <Card title="Нүүр зураг">
            <ImageInput name="cover_image" current={f?.cover_image ? '/' + f.cover_image : null} className="w-full aspect-video object-cover rounded-lg border border-line mt-2.5" />
            <p className="text-xs text-muted mt-2">16:9 харьцаатай зураг тохиромжтой. 8MB хүртэл.</p>
          </Card>
          {f && (
            <Card title="Мэдээлэл">
              <div className="text-sm text-muted space-y-1.5">
                <div>ID: <span className="text-ink font-medium">{f.id}</span></div>
                <div>Үүсгэсэн: <span className="text-ink font-medium">{fmtDate(f.created_at, 'd.m.Y H:i')}</span></div>
                <div>Зассан: <span className="text-ink font-medium">{fmtDate(f.updated_at, 'd.m.Y H:i')}</span></div>
              </div>
            </Card>
          )}
        </div>
      </form>
    </>
  );
}
