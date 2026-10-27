/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { fileUrl } from '@/lib/format';

// ── Нийтлэг класс ────────────────────────────────────────────
export const INP =
  'w-full bg-surface border border-line2 rounded-lg px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-primary focus:ring-0 transition-colors';
export const LBL = 'block text-[11px] font-medium uppercase tracking-widest text-muted mb-1.5';
export const BTN =
  'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border border-primary text-primary-ink hover:bg-primary/10 transition-colors disabled:opacity-50';
export const BTN_SOLID =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50';
export const BTN_GHOST =
  'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border border-line2 text-ink2 hover:border-primary hover:text-ink transition-colors disabled:opacity-50';
export const ICON_BTN =
  'w-8 h-8 grid place-items-center rounded-md border border-line2 text-ink2 hover:text-primary hover:border-primary transition-colors';
export const ICON_BTN_DANGER =
  'w-8 h-8 grid place-items-center rounded-md border border-line2 text-ink2 hover:text-live hover:border-live transition-colors';
export const TH = 'text-left font-medium py-2.5 px-3';
export const TD = 'py-2.5 px-3';
export const TR = 'border-b border-line last:border-0 hover:bg-raise/60 transition-colors';

export function I({ n, className = '' }: { n: string; className?: string }) {
  return <span className={`material-icons-round ${className}`} aria-hidden="true">{n}</span>;
}

export function Crumbs({ items }: { items: [string, string?][] }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted mb-6 flex-wrap">
      {items.map(([label, href], i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span>/</span>}
          {href ? (
            <Link href={href} className="hover:text-primary transition-colors">{label}</Link>
          ) : (
            <span className="text-ink2">{label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

export function PageHead({ title, count, children }: { title: ReactNode; count?: number; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
      <h2 className="font-display text-2xl uppercase tracking-wide">
        {title} {count !== undefined && <span className="text-muted text-lg">({count})</span>}
      </h2>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}

const PILL: Record<string, [string, string]> = {
  scheduled: ['text-reg bg-reg/10', 'Хуваарьт'],
  live: ['text-live bg-live/10', 'Шууд'],
  finished: ['text-done bg-done/10', 'Дууссан'],
  cancelled: ['text-live bg-live/10', 'Цуцлагдсан'],
  registration: ['text-reg bg-reg/10', 'Бүртгэл'],
  draft: ['text-muted bg-muted/10', 'Ноорог'],
  published: ['text-open bg-open/10', 'Нийтлэгдсэн'],
  active: ['text-open bg-open/10', 'Идэвхтэй'],
  inactive: ['text-muted bg-muted/10', 'Идэвхгүй'],
  injured: ['text-amber-400 bg-amber-400/10', 'Гэмтэлтэй'],
};

export function Pill({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-xs text-muted">—</span>;
  const [cls, label] = PILL[status] ?? ['text-muted bg-muted/10', status];
  return <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded whitespace-nowrap ${cls}`}>{label}</span>;
}

export function Empty({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="text-center py-16 border border-line rounded-lg text-muted">
      <I n={icon} className="text-3xl block mb-2 opacity-40" />
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function Card({ title, children, className = '' }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`border border-line rounded-lg p-5 ${className}`}>
      {title && <h3 className="font-medium text-[13px] uppercase tracking-widest text-muted mb-3">{title}</h3>}
      {children}
    </div>
  );
}

export function Thumb({ src, className = 'w-9 h-9 rounded-lg', icon = 'emoji_events', style }: { src: string | null | undefined; className?: string; icon?: string; style?: React.CSSProperties }) {
  return (
    <span className={`grid place-items-center shrink-0 overflow-hidden bg-line text-muted ${className}`} style={style}>
      {src ? <img src={fileUrl(src)} alt="" className="w-full h-full object-cover" loading="lazy" /> : <I n={icon} className="text-base" />}
    </span>
  );
}

export function StatTile({ label, value, icon, color, sub }: { label: string; value: ReactNode; icon: string; color: string; sub?: string }) {
  return (
    <div className="relative overflow-hidden border border-line rounded-lg p-5 pl-[22px]">
      <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-widest text-muted mb-1.5">{label}</div>
          <div className="font-display text-3xl leading-none">{value}</div>
          {sub && <div className="text-xs text-muted mt-1.5">{sub}</div>}
        </div>
        <I n={icon} className="text-xl opacity-50" />
      </div>
    </div>
  );
}

export const GENDER: Record<string, [string, string]> = {
  M: ['Эрэгтэй', '#5b9bdd'],
  F: ['Эмэгтэй', '#ef5f52'],
  Mixed: ['Холимог', '#f39c12'],
  O: ['Бусад', '#75798c'],
};
