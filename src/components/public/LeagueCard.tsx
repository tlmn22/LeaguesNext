/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { accentOf, fileUrl, fmtDate, initials } from '@/lib/format';
import { TierStars } from '../ui';

export type LeagueCardRow = {
  id: number;
  name: string;
  slug: string | null;
  logo: string | null;
  primary_color: string | null;
  tier: number | null;
  sid: number;
  sname: string;
  sstatus: 'active' | 'registration' | 'finished';
  start_date?: string | null;
  team_cnt: number;
  match_cnt: number;
  done_cnt?: number;
};

export const leagueHref = (slug: string | null, id: number, sid?: number, page = '') =>
  `/league/${encodeURIComponent(slug || String(id))}${page ? '/' + page : ''}${sid ? `?s=${sid}` : ''}`;

function StatusBadge({ s }: { s: LeagueCardRow['sstatus'] }) {
  if (s === 'active')
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-open shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-open live-dot" />
        Идэвхтэй
      </span>
    );
  if (s === 'finished') return <span className="text-[11px] font-medium text-done shrink-0">Дууссан</span>;
  return <span className="text-[11px] font-medium text-reg shrink-0">Бүртгэл</span>;
}

/** Лигүүд хуудасны карт */
export function LeagueCard({ lg }: { lg: LeagueCardRow }) {
  const color = accentOf(lg.primary_color);
  const tier = Number(lg.tier ?? 3);
  return (
    <Link href={leagueHref(lg.slug, lg.id, lg.sid)} className="group block p-5 border border-line rounded-lg hover:border-primary transition-colors">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <span
            className="w-12 h-12 rounded-lg grid place-items-center shrink-0 overflow-hidden font-display text-base"
            style={{ background: color + '1a', color }}
          >
            {lg.logo ? <img src={fileUrl(lg.logo)} alt="" className="w-full h-full object-contain p-1" /> : initials(lg.name)}
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-lg uppercase tracking-wide leading-tight truncate group-hover:text-primary transition-colors">{lg.name}</h3>
            <div className="flex items-center gap-2 mt-1.5">
              <TierStars tier={tier} />
              <span className="text-[10px] text-muted uppercase">Tier {tier}</span>
            </div>
          </div>
        </div>
        <StatusBadge s={lg.sstatus} />
      </div>

      <p className="text-xs text-muted mb-4 truncate">
        {lg.sname}
        {lg.start_date ? ` · ${fmtDate(lg.start_date, 'Y.m.d')}` : ''}
      </p>

      <div className="flex items-center justify-between border-t border-line pt-3.5">
        <div className="flex gap-5">
          <div>
            <span className="font-display text-lg">{lg.team_cnt}</span> <span className="text-[11px] text-muted uppercase">баг</span>
          </div>
          <div>
            <span className="font-display text-lg">{lg.match_cnt}</span> <span className="text-[11px] text-muted uppercase">тог.</span>
          </div>
          <div>
            <span className="font-display text-lg">{lg.done_cnt ?? 0}</span> <span className="text-[11px] text-muted uppercase">дууссан</span>
          </div>
        </div>
        <span className="material-icons-round text-muted group-hover:text-primary transition-colors text-lg">arrow_forward</span>
      </div>
    </Link>
  );
}
