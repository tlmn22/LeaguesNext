import Link from 'next/link';
import type { User } from '@/lib/auth';
import { query } from '@/lib/db';
import { BTN, BTN_GHOST, Crumbs, I, INP, LBL } from '@/components/admin/ui';
import { Submit } from '@/components/admin/client';
import SeasonTeamPicker from './SeasonTeamPicker';
import { saveMatch } from './actions';

export type MatchRow = {
  id: number; season_id: number; home_season_team_id: number; away_season_team_id: number; match_datetime: string;
  stage: string | null; game_no: number | null; arena_name: string | null; live_embed_code: string | null; status: string;
};

export default async function MatchForm({ user, match, seasonId }: { user: User; match?: MatchRow; seasonId?: number }) {
  const isAdm = user.role === 'admin';
  const seasons = await query<{ id: number; name: string; league_name: string }>(
    `SELECT s.id, s.name, l.name AS league_name FROM seasons s JOIN leagues l ON l.id=s.league_id
     ${isAdm ? '' : 'WHERE s.league_id=?'} ORDER BY CASE s.status WHEN 'active' THEN 1 WHEN 'registration' THEN 2 WHEN 'finished' THEN 3 ELSE 0 END, l.name, s.created_at DESC`,
    isAdm ? [] : [user.league_id ?? 0],
  );
  const teams = await query<{ id: number; season_id: number; name: string }>(
    `SELECT st.id, st.season_id, t.name FROM season_teams st JOIN teams t ON t.id=st.team_id JOIN seasons s ON s.id=st.season_id
     ${isAdm ? '' : 'WHERE s.league_id=?'} ORDER BY t.name`,
    isAdm ? [] : [user.league_id ?? 0],
  );
  const f = match;
  const sid = f?.season_id ?? seasonId ?? 0;
  const dt = f?.match_datetime ? f.match_datetime.slice(0, 16).replace(' ', 'T') : '';

  return (
    <>
      <Crumbs items={[['Dashboard', '/admin'], ['Тоглолтууд', '/admin/matches'], [f ? 'Засах' : 'Шинэ тоглолт']]} />
      <div className="border border-line rounded-lg p-6 max-w-3xl">
        <h2 className="font-display text-xl uppercase tracking-wide mb-5">{f ? 'Тоглолт засах' : 'Шинэ тоглолт'}</h2>
        <form action={saveMatch} className="space-y-5">
          {f && <input type="hidden" name="id" value={f.id} />}
          <SeasonTeamPicker seasons={seasons} teams={teams} seasonId={sid} home={f?.home_season_team_id} away={f?.away_season_team_id} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className={LBL}>Огноо, цаг <span className="text-live">*</span></label>
              <input type="datetime-local" name="match_datetime" required defaultValue={dt} className={INP} />
            </div>
            <div>
              <label className={LBL}>Шат</label>
              <select name="stage" defaultValue={f?.stage ?? 'regular'} className={INP}>
                <option value="regular">Үндсэн</option>
                <option value="playoff">Плейофф</option>
                <option value="allstar">Одны тоглолт</option>
                <option value="custom">Тусгай</option>
              </select>
            </div>
            <div>
              <label className={LBL}>Тоглолтын №</label>
              <input type="number" name="game_no" min={1} defaultValue={f?.game_no ?? ''} className={INP} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-5">
            <div>
              <label className={LBL}>Заал</label>
              <input type="text" name="arena_name" maxLength={120} defaultValue={f?.arena_name ?? ''} className={INP} placeholder="Жишээ: Saruul Sport Complex" />
            </div>
            <div>
              <label className={LBL}>Төлөв</label>
              <select name="status" defaultValue={f?.status ?? 'scheduled'} className={INP}>
                <option value="scheduled">Хуваарьт</option>
                <option value="live">Шууд</option>
                <option value="finished">Дууссан</option>
                <option value="cancelled">Цуцлагдсан</option>
              </select>
            </div>
          </div>
          <div>
            <label className={LBL}>Шууд дамжуулалт</label>
            <textarea
              name="live_embed_code"
              rows={3}
              defaultValue={f?.live_embed_code ?? ''}
              className={`${INP} font-mono text-xs resize-y`}
              placeholder="YouTube холбоос (https://youtu.be/...) эсвэл <iframe ...> embed код"
            />
          </div>
          <div className="border-t border-line pt-5 flex gap-3 flex-wrap">
            <Submit className={BTN}><I n="save" className="text-base" /> {f ? 'Хадгалах' : 'Нэмэх'}</Submit>
            <Link href={sid ? `/admin/matches?season_id=${sid}` : '/admin/matches'} className={BTN_GHOST}>Цуцлах</Link>
            {f && (
              <Link href={`/admin/matches/${f.id}/score`} className={`${BTN_GHOST} ml-auto`}>
                <I n="scoreboard" className="text-base" /> Дүн / Boxscore
              </Link>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
