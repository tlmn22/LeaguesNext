/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { canManageLeague, requireRole } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { STAGES, fileUrl, fmtDate } from '@/lib/format';
import { BTN, BTN_GHOST, BTN_SOLID, Crumbs, Empty, GENDER, ICON_BTN, ICON_BTN_DANGER, I, INP, LBL, Pill, TH, TD, TR, Thumb } from '@/components/admin/ui';
import { ConfirmButton, Modal, SearchPick, Submit } from '@/components/admin/client';
import { addSeasonTeam, removeSeasonTeam, updateZone } from '../actions';
import MatchTable from '@/components/admin/MatchTable';
import { seasonSponsors } from '@/lib/sponsors';
import SponsorsTab from './SponsorsTab';

export const metadata = { title: 'Улирал' };

type ST = { id: number; team_id: number; zone: string | null; seed: number | null; team_name: string; short_name: string | null; logo_path: string | null; gender: string; player_count: number };
export type M = { id: number; stage: string | null; match_datetime: string; arena_name: string | null; status: string; home_score: number; away_score: number; home_team: string; home_logo: string | null; away_team: string; away_logo: string | null; stat_count: number };

export default async function SeasonView({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const user = await requireRole(['admin', 'commissioner']);
  const id = parseInt((await params).id, 10) || 0;
  const rawTab = (await searchParams).tab;
  const tab = rawTab === 'matches' || rawTab === 'sponsors' ? rawTab : 'teams';

  const season = await queryOne<{ id: number; name: string; league_id: number; league_name: string; start_date: string | null; end_date: string | null; status: string }>(
    'SELECT s.id, s.name, s.league_id, s.start_date, s.end_date, s.status, l.name AS league_name FROM seasons s JOIN leagues l ON l.id=s.league_id WHERE s.id=?',
    [id],
  );
  if (!season) notFound();
  if (!canManageLeague(user, season.league_id)) redirect('/admin/forbidden');

  const [teams, available, matches, sponsors] = await Promise.all([
    query<ST>(
      `SELECT st.id, st.team_id, st.zone, st.seed, t.name AS team_name, t.short_name, t.logo_path, t.gender,
              (SELECT COUNT(DISTINCT tsr.player_id) FROM team_season_roster tsr WHERE tsr.season_team_id=st.id AND tsr.status='active') AS player_count
       FROM season_teams st JOIN teams t ON t.id=st.team_id
       WHERE st.season_id=? ORDER BY st.zone, t.name`,
      [id],
    ),
    query<{ id: number; name: string; short_name: string | null; gender: string }>(
      'SELECT id, name, short_name, gender FROM teams WHERE id NOT IN (SELECT team_id FROM season_teams WHERE season_id=?) ORDER BY name',
      [id],
    ),
    query<M>(
      `SELECT m.id, m.stage, m.match_datetime, m.arena_name, m.status, m.home_score, m.away_score,
              ht.name AS home_team, ht.logo_path AS home_logo, at2.name AS away_team, at2.logo_path AS away_logo,
              (SELECT COUNT(*) FROM match_player_stats mps WHERE mps.match_id=m.id) AS stat_count
       FROM matches m
       JOIN season_teams hst ON hst.id=m.home_season_team_id
       JOIN season_teams ast ON ast.id=m.away_season_team_id
       JOIN teams ht ON ht.id=hst.team_id
       JOIN teams at2 ON at2.id=ast.team_id
       WHERE m.season_id=? ORDER BY m.match_datetime DESC`,
      [id],
    ),
    seasonSponsors(id),
  ]);

  const finished = matches.filter((m) => m.status === 'finished').length;
  const totalPlayers = teams.reduce((a, t) => a + Number(t.player_count), 0);

  return (
    <>
      <Crumbs items={[['Dashboard', '/admin'], ['Улирал', '/admin/seasons'], [season.name]]} />

      <div className="border border-line rounded-xl bg-surface p-5 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="font-display text-3xl leading-none">{season.name}</div>
            <div className="text-sm text-muted mt-1.5 flex items-center gap-1.5 flex-wrap">
              <I n="emoji_events" className="text-sm" /> {season.league_name}
              {season.start_date && (
                <>
                  · <I n="event" className="text-sm" /> {fmtDate(season.start_date, 'd.m.Y')}
                  {season.end_date ? ` — ${fmtDate(season.end_date, 'd.m.Y')}` : ''}
                </>
              )}
            </div>
            <div className="mt-2"><Pill status={season.status} /></div>
          </div>
          <Link href={`/admin/seasons/${id}/edit`} className={BTN_GHOST}><I n="edit" className="text-base" /> Засах</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {([[teams.length, 'Баг', '#F2743A'], [matches.length, 'Тоглолт', '#5b9bdd'], [finished, 'Дууссан', '#3fb173'], [totalPlayers, 'Тоглогч', '#f39c12']] as const).map(([v, l, c]) => (
            <div key={l} className="bg-raise rounded-lg p-3 text-center">
              <div className="font-display text-3xl" style={{ color: c }}>{v}</div>
              <div className="text-xs text-muted">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-b border-line mb-5 flex">
        {([['teams', 'Багууд', 'groups'], ['matches', 'Тоглолтууд', 'sports_basketball'], ['sponsors', 'Спонсорууд', 'handshake']] as const).map(([k, l, ic]) => (
          <Link
            key={k}
            href={`/admin/seasons/${id}?tab=${k}`}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px flex items-center gap-1.5 ${tab === k ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink'}`}
          >
            <I n={ic} className="text-base" /> {l}
          </Link>
        ))}
      </div>

      {tab === 'teams' ? (
        <>
          <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
            <div className="text-sm text-muted">{teams.length} баг бүртгэлтэй</div>
            {available.length > 0 && (
              <Modal trigger={<><I n="add" className="text-base" /> Баг нэмэх</>} triggerClass={BTN} title="Баг нэмэх">
                <form action={addSeasonTeam} className="space-y-4">
                  <input type="hidden" name="season_id" value={id} />
                  <div>
                    <label className={LBL}>Баг <span className="text-live">*</span></label>
                    <SearchPick
                      name="team_id"
                      required
                      placeholder="Багийн нэрээр хайх..."
                      options={available.map((t) => ({ id: t.id, label: t.name + (t.short_name ? ` (${t.short_name})` : ''), meta: GENDER[t.gender]?.[0] }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LBL}>Бүлэг / Zone</label>
                      <input type="text" name="zone" className={INP} placeholder="A, B..." />
                    </div>
                    <div>
                      <label className={LBL}>Seed</label>
                      <input type="number" name="seed" className={INP} min={1} placeholder="1" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Submit className={BTN_SOLID}>Нэмэх</Submit>
                  </div>
                </form>
              </Modal>
            )}
          </div>

          {teams.length === 0 ? (
            <Empty icon="groups">Баг бүртгэгдээгүй байна</Empty>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {teams.map((t) => {
                const g = GENDER[t.gender] ?? GENDER.M;
                return (
                  <div key={t.id} className="border border-line rounded-xl bg-surface p-4 text-center flex flex-col">
                    <Thumb src={t.logo_path} icon="groups" className="w-14 h-14 rounded-xl mx-auto mb-2" />
                    <div className="font-semibold">{t.team_name}</div>
                    {t.short_name && <div className="text-[11px] text-muted">{t.short_name}</div>}
                    <div className="mt-1.5 mb-1">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ color: g[1], background: g[1] + '1a' }}>{g[0]}</span>
                    </div>
                    <div className="text-xs text-muted mb-1 flex items-center justify-center gap-1.5">
                      {t.zone || t.seed ? (
                        <span className="px-2 py-0.5 rounded bg-raise text-ink2">
                          {t.zone ? `Бүлэг ${t.zone}` : ''}
                          {t.zone && t.seed ? ' · ' : ''}
                          {t.seed ? `Seed ${t.seed}` : ''}
                        </span>
                      ) : (
                        'Бүлэг/Seed тохируулаагүй'
                      )}
                      <Modal trigger={<I n="edit" className="text-xs" />} triggerClass="text-muted hover:text-primary" title={`${t.team_name} — Бүлэг/Seed`}>
                        <form action={updateZone} className="space-y-4 text-left">
                          <input type="hidden" name="season_team_id" value={t.id} />
                          <input type="hidden" name="season_id" value={id} />
                          <div>
                            <label className={LBL}>Бүлэг / Zone</label>
                            <input type="text" name="zone" className={INP} defaultValue={t.zone ?? ''} placeholder="A, B, Хойд..." />
                          </div>
                          <div>
                            <label className={LBL}>Seed дугаар</label>
                            <input type="number" name="seed" className={INP} defaultValue={t.seed ?? ''} min={1} />
                          </div>
                          <div className="flex justify-end">
                            <Submit className={BTN_SOLID}>Хадгалах</Submit>
                          </div>
                        </form>
                      </Modal>
                    </div>
                    <div className="text-sm text-muted mb-3 flex items-center justify-center gap-1">
                      <I n="person" className="text-sm" /> {t.player_count} тоглогч
                    </div>
                    <div className="flex gap-1.5 justify-center flex-wrap mt-auto">
                      <Link href={`/admin/season-teams/${t.id}`} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-primary/15 text-primary-ink hover:bg-primary/25">
                        <I n="list" className="text-sm" /> Roster
                      </Link>
                      <a href={`/admin/season-teams/${t.id}/template`} title="Excel template татах" className={ICON_BTN}>
                        <I n="download" className="text-sm" />
                      </a>
                      <Link href={`/admin/season-teams/${t.id}/import`} title="Excel-ээс оруулах" className={ICON_BTN}>
                        <I n="upload_file" className="text-sm" />
                      </Link>
                      <form action={removeSeasonTeam}>
                        <input type="hidden" name="season_team_id" value={t.id} />
                        <input type="hidden" name="season_id" value={id} />
                        <ConfirmButton message={`${t.team_name} багийг улирлаас хасах уу?`} className={ICON_BTN_DANGER} title="Хасах">
                          <I n="close" className="text-sm" />
                        </ConfirmButton>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : tab === 'sponsors' ? (
        <SponsorsTab seasonId={id} sponsors={sponsors} />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-sm text-muted">{matches.length} тоглолт</div>
            <Link href={`/admin/matches/new?season_id=${id}`} className={BTN}>
              <I n="add" className="text-base" /> Тоглолт нэмэх
            </Link>
          </div>
          {matches.length === 0 ? (
            <Empty icon="sports_basketball">Тоглолт байхгүй байна</Empty>
          ) : (
            <MatchTable matches={matches} back={`/admin/seasons/${id}?tab=matches`} />
          )}
        </>
      )}
    </>
  );
}
