import Link from 'next/link';
import { query } from '@/lib/db';
import { fmtDate } from '@/lib/format';
import { BTN, BTN_GHOST, Card, Crumbs, I, INP, LBL } from '@/components/admin/ui';
import { ColorInput, ImageInput, Submit } from '@/components/admin/client';
import { saveLeague } from './actions';

export type LeagueRow = {
  id: number; name: string; tier: number; slug: string; location: string | null; description: string | null;
  primary_color: string | null; commissioner_user_id: number | null; logo: string | null; created_at: string;
};

export default async function LeagueForm({ league }: { league?: LeagueRow }) {
  const commissioners = await query<{ id: number; name: string; league_id: number | null }>(
    "SELECT id, name, league_id FROM users WHERE role='commissioner' AND status='active' ORDER BY name",
  );
  const f = league;
  const title = f ? 'Лиг засах' : 'Шинэ лиг';

  return (
    <>
      <Crumbs items={[['Dashboard', '/admin'], ['Лигүүд', '/admin/leagues'], [f ? f.name : 'Шинэ лиг']]} />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="border border-line rounded-lg p-6">
          <h2 className="font-display text-xl uppercase tracking-wide mb-5">{title}</h2>
          <form action={saveLeague} className="space-y-5">
            {f && <input type="hidden" name="id" value={f.id} />}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-5">
              <div>
                <label className={LBL}>Лигийн нэр <span className="text-live">*</span></label>
                <input type="text" name="name" className={INP} defaultValue={f?.name} required placeholder="Жишээ: Увс лиг" />
              </div>
              <div>
                <label className={LBL}>Tier <span className="text-live">*</span></label>
                <select name="tier" className={INP} defaultValue={f?.tier ?? 2}>
                  <option value={1}>Tier 1 — Дээд лиг</option>
                  <option value={2}>Tier 2 — Дунд лиг</option>
                  <option value={3}>Tier 3 — Нийтийн лиг</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className={LBL}>Slug <span className="normal-case font-normal text-muted">(URL нэр)</span></label>
                <input type="text" name="slug" className={INP} defaultValue={f?.slug} placeholder="uvs-league" pattern="[A-Za-z0-9\-]*" title="Латин үсэг, тоо, зураас" />
              </div>
              <div>
                <label className={LBL}>Байршил</label>
                <input type="text" name="location" className={INP} defaultValue={f?.location ?? ''} placeholder="Улаанбаатар" />
              </div>
              <div>
                <label className={LBL}>Үндсэн өнгө</label>
                <ColorInput name="primary_color" defaultValue={f?.primary_color || '#E8601C'} />
              </div>
            </div>
            <div>
              <label className={LBL}>Тайлбар</label>
              <textarea name="description" rows={3} className={`${INP} resize-y`} defaultValue={f?.description ?? ''} placeholder="Лигийн тухай товч мэдээлэл..." />
            </div>
            <div>
              <label className={LBL}>Комиссар</label>
              <select name="commissioner_user_id" className={INP} defaultValue={f?.commissioner_user_id ?? ''}>
                <option value="">— Сонгох —</option>
                {commissioners.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="text-xs text-muted mt-1.5">Комиссар байхгүй бол эхлээд Хэрэглэгчид хэсэгт үүсгэнэ үү.</p>
            </div>
            <div>
              <label className={LBL}>Лого</label>
              <ImageInput name="logo" current={f?.logo ? '/' + f.logo : null} />
            </div>
            <div className="border-t border-line pt-5 flex gap-3 flex-wrap">
              <Submit className={BTN}>
                <I n="save" className="text-base" /> {f ? 'Хадгалах' : 'Нэмэх'}
              </Submit>
              <Link href="/admin/leagues" className={BTN_GHOST}>Цуцлах</Link>
              <span className="flex-1" />
              <span className="text-[11px] text-muted self-center"><span className="text-primary-ink">*</span> Заавал бөглөх талбар</span>
            </div>
          </form>
        </div>

        <div className="space-y-5">
          <Card title="Tier тайлбар">
            <div className="space-y-2.5 text-sm text-ink2">
              <div><span className="text-[11px] font-medium px-2 py-0.5 rounded text-open bg-open/10">Tier 1</span> — Мэргэжлийн, дээд түвшний лиг</div>
              <div><span className="text-[11px] font-medium px-2 py-0.5 rounded text-reg bg-reg/10">Tier 2</span> — Хагас мэргэжлийн лиг</div>
              <div><span className="text-[11px] font-medium px-2 py-0.5 rounded text-muted bg-muted/10">Tier 3</span> — Нийтийн, сонирхогчдын лиг</div>
            </div>
          </Card>
          {f && (
            <Card title="Мэдээлэл">
              <div className="text-sm text-muted space-y-1.5">
                <div>ID: <span className="text-ink font-medium">{f.id}</span></div>
                <div>Үүсгэсэн: <span className="text-ink font-medium">{fmtDate(f.created_at, 'd.m.Y H:i')}</span></div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
