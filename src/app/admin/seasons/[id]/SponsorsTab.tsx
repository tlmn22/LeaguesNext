/* eslint-disable @next/next/no-img-element */
import { SPONSOR_TIERS, type Sponsor } from '@/lib/sponsors';
import { fileUrl } from '@/lib/format';
import { BTN, Empty, ICON_BTN_DANGER, I, INP, LBL } from '@/components/admin/ui';
import { ConfirmButton, ImageInput, Modal, Submit } from '@/components/admin/client';
import { addSponsor, deleteSponsor } from '../sponsor-actions';

/** Улирлын спонсорууд — сайтын лигийн хуудсанд гүйдэг туузаар харагдана */
export default function SponsorsTab({ seasonId, sponsors }: { seasonId: number; sponsors: Sponsor[] }) {
  return (
    <>
      <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
        <div className="text-sm text-muted">{sponsors.length} байгууллага · сайтын лигийн хуудсанд гүйдэг туузаар харагдана</div>
        <Modal trigger={<><I n="add" className="text-base" /> Спонсор нэмэх</>} triggerClass={BTN} title="Спонсор нэмэх">
          <form action={addSponsor} className="space-y-4">
            <input type="hidden" name="season_id" value={seasonId} />
            <div>
              <label className={LBL}>Байгууллагын нэр <span className="text-live">*</span></label>
              <input type="text" name="name" required maxLength={120} className={INP} placeholder="Жишээ: Tenger Capital" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-4">
              <div>
                <label className={LBL}>Ангилал</label>
                <select name="tier" className={INP} defaultValue="sponsor">
                  {SPONSOR_TIERS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LBL}>Дараалал</label>
                <input type="number" name="sort_order" defaultValue={0} className={INP} />
              </div>
            </div>
            <div>
              <label className={LBL}>Вэбсайт</label>
              <input type="url" name="url" className={INP} placeholder="https://..." />
            </div>
            <div>
              <label className={LBL}>Лого</label>
              <ImageInput name="logo" className="h-14 rounded-lg border border-line mt-2.5 bg-black p-2" />
              <p className="text-xs text-muted mt-1.5">Хар дэвсгэр дээр харагдана — цагаан эсвэл тунгалаг (PNG) лого тохиромжтой.</p>
            </div>
            <Submit className={BTN}><I n="save" className="text-base" /> Нэмэх</Submit>
          </form>
        </Modal>
      </div>

      {sponsors.length === 0 ? (
        <Empty icon="handshake">Спонсор бүртгээгүй байна</Empty>
      ) : (
        <div className="space-y-6">
          {SPONSOR_TIERS.map(([tier, label]) => {
            const list = sponsors.filter((s) => s.tier === tier);
            if (!list.length) return null;
            return (
              <div key={tier}>
                <div className="text-[11px] font-medium uppercase tracking-widest text-muted mb-2">{label}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {list.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 border border-line rounded-lg p-3">
                      <span className="w-24 h-12 rounded-md bg-black grid place-items-center shrink-0 overflow-hidden p-1.5">
                        {s.logo ? <img src={fileUrl(s.logo)} alt="" className="max-w-full max-h-full object-contain" /> : <span className="text-white text-xs font-bold truncate px-1">{s.name}</span>}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{s.name}</div>
                        <div className="text-xs text-muted truncate">{s.url || 'Вэбсайтгүй'} · #{s.sort_order}</div>
                      </div>
                      <form action={deleteSponsor}>
                        <input type="hidden" name="id" value={s.id} />
                        <ConfirmButton message={`"${s.name}"-г хасах уу?`} className={ICON_BTN_DANGER} title="Хасах">
                          <I n="delete" className="text-sm" />
                        </ConfirmButton>
                      </form>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
