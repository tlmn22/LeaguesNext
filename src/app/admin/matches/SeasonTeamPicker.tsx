'use client';

import { useState } from 'react';
import { INP, LBL } from '@/components/admin/ui';

/** Улирал сонгоход тухайн улирлын багуудыг шүүж харуулна */
export default function SeasonTeamPicker({
  seasons,
  teams,
  seasonId,
  home,
  away,
}: {
  seasons: { id: number; name: string; league_name: string }[];
  teams: { id: number; season_id: number; name: string }[];
  seasonId: number;
  home?: number;
  away?: number;
}) {
  const [sid, setSid] = useState(seasonId || 0);
  const [h, setH] = useState(home ?? 0);
  const [a, setA] = useState(away ?? 0);
  const list = teams.filter((t) => t.season_id === sid);

  return (
    <>
      <div>
        <label className={LBL}>Улирал <span className="text-live">*</span></label>
        <select
          name="season_id"
          required
          value={sid || ''}
          onChange={(e) => {
            setSid(Number(e.target.value));
            setH(0);
            setA(0);
          }}
          className={INP}
        >
          <option value="">— Сонгох —</option>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>{s.league_name} — {s.name}</option>
          ))}
        </select>
        {sid > 0 && list.length < 2 && <p className="text-xs text-amber-700 dark:text-amber-400 mt-1.5">Энэ улиралд 2-оос цөөн баг бүртгэлтэй байна. Эхлээд улиралд баг нэмнэ үү.</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={LBL}>Гэрийн баг <span className="text-live">*</span></label>
          <select name="home_season_team_id" required value={h || ''} onChange={(e) => setH(Number(e.target.value))} className={INP}>
            <option value="">— Сонгох —</option>
            {list.map((t) => (
              <option key={t.id} value={t.id} disabled={t.id === a}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={LBL}>Зочин баг <span className="text-live">*</span></label>
          <select name="away_season_team_id" required value={a || ''} onChange={(e) => setA(Number(e.target.value))} className={INP}>
            <option value="">— Сонгох —</option>
            {list.map((t) => (
              <option key={t.id} value={t.id} disabled={t.id === h}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
