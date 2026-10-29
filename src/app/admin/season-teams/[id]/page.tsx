import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { canManageLeague, requireRole } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { fileUrl, fmtDate, todayUB } from '@/lib/format';
import { BTN, BTN_GHOST, BTN_SOLID, Crumbs, Empty, ICON_BTN, ICON_BTN_DANGER, I, INP, LBL, Pill, TH, TD, TR, Thumb } from '@/components/admin/ui';
import { ConfirmButton, ImageInput, Modal, SearchPick, Submit } from '@/components/admin/client';
import { rosterAddExisting, rosterAddNew, rosterEdit, rosterLeave, rosterRejoin } from '../actions';

export const metadata = { title: 'Roster' };

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'Manager', 'Head Coach', 'Assistant Coach'];

type R = {
  id: number; player_id: number; jersey_no: string | null; position: string | null; is_captain: number; status: string;
  joined_at: string | null; left_at: string | null; last_name: string; first_name: string; birth_date: string | null;
  height_cm: number | null; weight_kg: number | null; photo_path: string | null; phone: string | null; gender: string;
};

function PositionSelect({ value }: { value?: string | null }) {
  return (
    <select name="position" className={INP} defaultValue={value ?? ''}>
      <option value="">—</option>
      {POSITIONS.map((p) => (
        <option key={p} value={p}>{p}</option>
      ))}
    </select>
  );
}

export default async function RosterPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(['admin', 'commissioner']);
  const stid = parseInt((await params).id, 10) || 0;
  const st = await queryOne<{ id: number; season_id: number; team_id: number; zone: string | null; team_name: string; short_name: string | null; logo_path: string | null; gender: string; season_name: string; league_name: string; league_id: number }>(
    `SELECT st.id, st.season_id, st.team_id, st.zone, t.name AS team_name, t.short_name, t.logo_path, t.gender,
            s.name AS season_name, l.name AS league_name, l.id AS league_id
     FROM season_teams st JOIN teams t ON t.id=st.team_id JOIN seasons s ON s.id=st.season_id JOIN leagues l ON l.id=s.league_id
     WHERE st.id=?`,
    [stid],
  );
  if (!st) notFound();
  if (!canManageLeague(user, st.league_id)) redirect('/admin/forbidden');

  const genderFilter = st.gender === 'M' ? "AND p.gender='M'" : st.gender === 'F' ? "AND p.gender='F'" : '';
  const [roster, available] = await Promise.all([
    query<R>(
      `SELECT tsr.id, tsr.player_id, tsr.jersey_no, tsr.position, tsr.is_captain, tsr.status, tsr.joined_at, tsr.left_at,
              p.last_name, p.first_name, p.birth_date, p.height_cm, p.weight_kg, p.photo_path, p.phone, p.gender
       FROM team_season_roster tsr JOIN players p ON p.id=tsr.player_id
       WHERE tsr.season_team_id=?
       ORDER BY tsr.status='active' DESC, (tsr.jersey_no IS NULL OR tsr.jersey_no=''), CASE WHEN tsr.jersey_no ~ '^[0-9]+$' THEN tsr.jersey_no::integer ELSE 0 END, p.last_name`,
      [stid],
    ),
    query<{ id: number; last_name: string; first_name: string; birth_date: string | null; height_cm: number | null }>(
      `SELECT p.id, p.last_name, p.first_name, p.birth_date, p.height_cm FROM players p
       WHERE p.id NOT IN (SELECT player_id FROM team_season_roster WHERE season_team_id=?)
         ${genderFilter}
         AND p.id NOT IN (
           SELECT tsr2.player_id FROM team_season_roster tsr2 JOIN season_teams st2 ON st2.id=tsr2.season_team_id
           WHERE st2.season_id=? AND tsr2.status='active' AND st2.id<>?)
       ORDER BY p.last_name, p.first_name`,
      [stid, st.season_id, stid],
    ),
  ]);
  const activeCount = roster.filter((r) => r.status === 'active').length;
  const today = todayUB();

  return (
    <>
      <Crumbs items={[['Dashboard', '/admin'], ['Улирал', '/admin/seasons'], [st.season_name, `/admin/seasons/${st.season_id}?tab=teams`], ['Roster']]} />

      <div className="border border-line rounded-xl bg-surface p-4 sm:p-5 mb-6 flex items-center gap-4 flex-wrap">
        <Thumb src={st.logo_path} icon="groups" className="w-14 h-14 rounded-xl" />
        <div className="flex-1 min-w-0">
          <div className="font-display text-2xl">
            {st.team_name} {st.short_name && <span className="text-muted text-base">({st.short_name})</span>}
          </div>
          <div className="text-sm text-muted">
            {st.league_name} — {st.season_name}
            {st.zone && <span className="ml-2 px-2 py-0.5 rounded bg-raise text-ink2 text-xs">Бүлэг {st.zone}</span>}
          </div>
        </div>
        <div className="text-right">
          <span className="font-display text-3xl">{activeCount}</span> <span className="text-sm text-muted">идэвхтэй тоглогч</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="font-display text-xl uppercase tracking-wide">Тоглогчид</h2>
        <div className="flex gap-2 flex-wrap">
          <a href={`/admin/season-teams/${stid}/template`} className={BTN_GHOST}><I n="download" className="text-base" /> Template</a>
          <Link href={`/admin/season-teams/${stid}/import`} className={BTN_GHOST}><I n="upload_file" className="text-base" /> Excel import</Link>
          <Modal trigger={<><I n="person_search" className="text-base" /> Бүртгэлтэй тоглогч</>} triggerClass={BTN} title="Бүртгэлтэй тоглогч нэмэх" disabled={available.length === 0}>
            <form action={rosterAddExisting} className="space-y-4">
              <input type="hidden" name="season_team_id" value={stid} />
              <div>
                <label className={LBL}>Тоглогч <span className="text-live">*</span></label>
                <SearchPick
                  name="player_id"
                  required
                  options={available.map((p) => ({
                    id: p.id,
                    label: `${p.last_name} ${p.first_name}`,
                    meta: [p.birth_date?.slice(0, 4), p.height_cm ? `${p.height_cm}см` : ''].filter(Boolean).join(' · '),
                  }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LBL}>Дугаар</label><input type="text" name="jersey_no" maxLength={5} className={INP} /></div>
                <div><label className={LBL}>Байрлал</label><PositionSelect /></div>
                <div><label className={LBL}>Нэгдсэн огноо</label><input type="date" name="joined_at" defaultValue={today} className={INP} /></div>
                <label className="flex items-center gap-2 text-sm text-ink2 mt-6"><input type="checkbox" name="is_captain" className="rounded bg-surface border-line2" /> Ахлагч</label>
              </div>
              <div className="flex justify-end"><Submit className={BTN_SOLID}>Нэмэх</Submit></div>
            </form>
          </Modal>
          <Modal trigger={<><I n="person_add" className="text-base" /> Шинэ тоглогч</>} triggerClass={BTN} title="Шинэ тоглогч үүсгэж нэмэх">
            <form action={rosterAddNew} className="space-y-4">
              <input type="hidden" name="season_team_id" value={stid} />
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LBL}>Овог *</label><input type="text" name="last_name" required className={INP} /></div>
                <div><label className={LBL}>Нэр *</label><input type="text" name="first_name" required className={INP} /></div>
                <div>
                  <label className={LBL}>Хүйс</label>
                  <select name="gender" className={INP} defaultValue={st.gender === 'F' ? 'F' : 'M'}>
                    <option value="M">Эрэгтэй</option>
                    <option value="F">Эмэгтэй</option>
                    <option value="O">Бусад</option>
                  </select>
                </div>
                <div><label className={LBL}>Төрсөн огноо</label><input type="date" name="birth_date" className={INP} /></div>
                <div><label className={LBL}>Өндөр (см)</label><input type="number" name="height_cm" min={100} max={250} className={INP} /></div>
                <div><label className={LBL}>Дугаар</label><input type="text" name="jersey_no" maxLength={5} className={INP} /></div>
                <div><label className={LBL}>Байрлал</label><PositionSelect /></div>
                <div><label className={LBL}>Нэгдсэн огноо</label><input type="date" name="joined_at" defaultValue={today} className={INP} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm text-ink2"><input type="checkbox" name="is_captain" className="rounded bg-surface border-line2" /> Ахлагч</label>
              <div className="flex justify-end"><Submit className={BTN_SOLID}>Үүсгэж нэмэх</Submit></div>
            </form>
          </Modal>
        </div>
      </div>

      {roster.length === 0 ? (
        <Empty icon="person">Roster хоосон байна</Empty>
      ) : (
        <div className="overflow-x-auto border border-line rounded-xl bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-[11px] uppercase tracking-wide border-b border-line">
                <th className={`${TH} px-4 w-14`}>#</th>
                <th className={TH}>Тоглогч</th>
                <th className={TH}>Байрлал</th>
                <th className={TH}>Төрсөн</th>
                <th className={TH}>Өндөр/Жин</th>
                <th className={TH}>Утас</th>
                <th className={TH}>Төлөв</th>
                <th className="w-28 py-2.5 px-4" />
              </tr>
            </thead>
            <tbody>
              {roster.map((r) => (
                <tr key={r.id} className={`${TR} ${r.status !== 'active' ? 'opacity-50' : ''}`}>
                  <td className={`${TD} px-4 font-display text-lg`}>{r.jersey_no ?? '—'}</td>
                  <td className={TD}>
                    <div className="flex items-center gap-2.5">
                      <Thumb src={r.photo_path} icon="person" className="w-8 h-8 rounded-full" />
                      <div>
                        <Link href={`/player/${r.player_id}`} target="_blank" className="font-medium hover:text-primary">{r.last_name} {r.first_name}</Link>
                        {r.is_captain ? <span className="ml-1.5 text-[10px] font-bold text-primary">(C)</span> : null}
                        {r.left_at && <div className="text-[11px] text-muted">Гарсан: {fmtDate(r.left_at)}</div>}
                      </div>
                    </div>
                  </td>
                  <td className={`${TD} text-ink2`}>{r.position ?? '—'}</td>
                  <td className={`${TD} text-ink2 whitespace-nowrap`}>{fmtDate(r.birth_date, 'Y.m.d')}</td>
                  <td className={`${TD} text-ink2 whitespace-nowrap`}>{r.height_cm ? `${r.height_cm}см` : '—'}{r.weight_kg ? ` / ${r.weight_kg}кг` : ''}</td>
                  <td className={`${TD} text-ink2 whitespace-nowrap`}>{r.phone || '—'}</td>
                  <td className={TD}><Pill status={r.status} /></td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-1.5 justify-end">
                      <Modal trigger={<I n="edit" className="text-sm" />} triggerClass={ICON_BTN} title={`${r.last_name} ${r.first_name}`} wide>
                        <form action={rosterEdit} className="space-y-4">
                          <input type="hidden" name="season_team_id" value={stid} />
                          <input type="hidden" name="roster_id" value={r.id} />
                          <input type="hidden" name="player_id" value={r.player_id} />
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div><label className={LBL}>Овог *</label><input type="text" name="last_name" required defaultValue={r.last_name} className={INP} /></div>
                            <div><label className={LBL}>Нэр *</label><input type="text" name="first_name" required defaultValue={r.first_name} className={INP} /></div>
                            <div>
                              <label className={LBL}>Хүйс</label>
                              <select name="gender" className={INP} defaultValue={r.gender}>
                                <option value="M">Эрэгтэй</option>
                                <option value="F">Эмэгтэй</option>
                                <option value="O">Бусад</option>
                              </select>
                            </div>
                            <div><label className={LBL}>Төрсөн огноо</label><input type="date" name="birth_date" defaultValue={r.birth_date ?? ''} className={INP} /></div>
                            <div><label className={LBL}>Өндөр (см)</label><input type="number" name="height_cm" defaultValue={r.height_cm ?? ''} className={INP} /></div>
                            <div><label className={LBL}>Жин (кг)</label><input type="number" name="weight_kg" defaultValue={r.weight_kg ?? ''} className={INP} /></div>
                            <div><label className={LBL}>Утас</label><input type="text" name="phone" defaultValue={r.phone ?? ''} className={INP} /></div>
                            <div><label className={LBL}>Дугаар</label><input type="text" name="jersey_no" maxLength={5} defaultValue={r.jersey_no ?? ''} className={INP} /></div>
                            <div><label className={LBL}>Байрлал</label><PositionSelect value={r.position} /></div>
                            <div>
                              <label className={LBL}>Төлөв</label>
                              <select name="status" className={INP} defaultValue={r.status}>
                                <option value="active">Идэвхтэй</option>
                                <option value="injured">Гэмтэлтэй</option>
                                <option value="inactive">Идэвхгүй</option>
                              </select>
                            </div>
                            <label className="flex items-center gap-2 text-sm text-ink2 mt-6"><input type="checkbox" name="is_captain" defaultChecked={!!r.is_captain} className="rounded bg-surface border-line2" /> Ахлагч</label>
                          </div>
                          <div>
                            <label className={LBL}>Зураг</label>
                            <ImageInput name="photo" current={r.photo_path ? fileUrl(r.photo_path) : null} className="h-16 w-16 object-cover rounded-full border border-line mt-2.5" />
                          </div>
                          <div className="flex justify-end"><Submit className={BTN_SOLID}>Хадгалах</Submit></div>
                        </form>
                      </Modal>
                      {r.status === 'active' ? (
                        <form action={rosterLeave}>
                          <input type="hidden" name="season_team_id" value={stid} />
                          <input type="hidden" name="roster_id" value={r.id} />
                          <ConfirmButton message={`${r.last_name} ${r.first_name}-г багаас гаргах уу?`} className={ICON_BTN_DANGER} title="Багаас гаргах">
                            <I n="logout" className="text-sm" />
                          </ConfirmButton>
                        </form>
                      ) : (
                        <form action={rosterRejoin}>
                          <input type="hidden" name="season_team_id" value={stid} />
                          <input type="hidden" name="roster_id" value={r.id} />
                          <ConfirmButton message="Тоглогчийг дахин идэвхжүүлэх үү?" className={ICON_BTN} title="Дахин идэвхжүүлэх">
                            <I n="restart_alt" className="text-sm" />
                          </ConfirmButton>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
