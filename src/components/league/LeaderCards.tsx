/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { LeaderRow } from '@/lib/league';
import { accentOf, fileUrl, initials, isLightColor, tc } from '@/lib/format';

export type LeaderCard = { key: string; label: string; unit: string; href: string; rows: LeaderRow[] };

const fmt = (v: number) => Number(v).toFixed(1);
const fullName = (p: LeaderRow) => `${tc(p.last_name)} ${tc(p.first_name)}`;

/** "Тэргүүлэгчид" — ангилал бүрт 1-р байр том, 2–5 жагсаалтаар */
export default function LeaderCards({ cards, sid, ac }: { cards: LeaderCard[]; sid: number; ac: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((c) => {
        const [top, ...rest] = c.rows;
        const color = top.team_color ? accentOf(top.team_color) : ac;
        const light = isLightColor(color);
        return (
          <section key={c.key} className="rounded-xl overflow-hidden border border-line bg-surface flex flex-col">
            <Link
              href={`/player/${top.pid}?s=${sid}`}
              className={`group relative block h-[150px] overflow-hidden ${light ? 'text-[#1f1a17]' : 'text-white'}`}
              style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${color} 70%, #000) 0%, ${color} 100%)` }}
            >
              <span
                className="absolute left-0 top-0 bg-black/45 text-white pl-4 pr-6 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em]"
                style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 12px) 100%, 0 100%)' }}
              >
                {c.label}
              </span>
              {top.photo_path ? (
                <img
                  src={fileUrl(top.photo_path)}
                  alt=""
                  className="absolute right-0 bottom-0 h-[128px] w-[118px] object-cover object-top transition-transform duration-300 group-hover:scale-105 origin-bottom"
                />
              ) : (
                <span className="absolute right-4 bottom-4 w-20 h-20 rounded-full bg-white/15 grid place-items-center font-display text-3xl">
                  {initials(tc(top.last_name), 1)}
                </span>
              )}
              <div className="absolute left-4 top-10 right-[124px]">
                {top.team_logo && (
                  <img src={fileUrl(top.team_logo)} alt="" className="w-7 h-7 rounded-md bg-white/90 object-contain p-0.5 mb-1.5" />
                )}
                <div className="font-bold text-[16px] leading-tight line-clamp-2">{fullName(top)}</div>
              </div>
              <div className="absolute left-4 bottom-3 text-[13px] font-bold tabular-nums">
                {fmt(top.val)} {c.unit}
              </div>
            </Link>

            <div className="flex-1">
              {rest.map((p) => (
                <Link
                  key={p.pid}
                  href={`/player/${p.pid}?s=${sid}`}
                  className="flex items-center gap-3 px-3 py-2 border-t border-line hover:bg-primary/[0.05] transition-colors"
                >
                  <span className="w-9 h-9 rounded-full bg-line grid place-items-center font-display text-sm shrink-0 overflow-hidden">
                    {p.photo_path ? <img src={fileUrl(p.photo_path)} alt="" className="w-full h-full object-cover object-top" /> : initials(tc(p.last_name), 1)}
                  </span>
                  <span className="flex-1 min-w-0 text-[14px] font-medium leading-snug line-clamp-2">{fullName(p)}</span>
                  <span className="text-[15px] font-semibold tabular-nums shrink-0">{fmt(p.val)}</span>
                </Link>
              ))}
            </div>

            <Link href={c.href} className="flex items-center justify-end gap-0.5 px-4 py-3 border-t border-line text-sm font-semibold hover:text-primary transition-colors">
              Бүгдийг харах <span className="material-icons-round text-lg">chevron_right</span>
            </Link>
          </section>
        );
      })}
    </div>
  );
}
