/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, ReactNode } from 'react';
import { fileUrl, initials } from '@/lib/format';

export const FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61581415891397';

export function FacebookIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 320 512" fill="currentColor" aria-hidden="true">
      <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
    </svg>
  );
}

export function Icon({ name, className = '', style }: { name: string; className?: string; style?: CSSProperties }) {
  return (
    <span className={`material-icons-round ${className}`} style={style} aria-hidden="true">
      {name}
    </span>
  );
}

/** Tier → 5 од (1→5, 2→3, 3→1) */
export function TierStars({ tier }: { tier: number }) {
  const filled = ({ 1: 5, 2: 3, 3: 1 } as Record<number, number>)[tier] ?? 3;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`w-3 h-3 ${i <= filled ? 'text-primary' : 'text-line2'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

/**
 * Лого/зураг байвал img, үгүй бол эхний үсгүүд.
 * `box` — гаднах span-ийн класс (хэмжээ, хэлбэр, фон).
 */
export function Logo({
  src,
  name,
  box,
  imgClass = 'w-full h-full object-cover',
  style,
  chars = 2,
  fallback,
}: {
  src: string | null | undefined;
  name: string | null | undefined;
  box: string;
  imgClass?: string;
  style?: CSSProperties;
  chars?: number;
  fallback?: ReactNode;
}) {
  return (
    <span className={`grid place-items-center shrink-0 overflow-hidden ${box}`} style={style}>
      {src ? <img src={fileUrl(src)} alt="" className={imgClass} loading="lazy" /> : (fallback ?? initials(name, chars))}
    </span>
  );
}

export function Img({ src, className, style, alt = '' }: { src: string | null | undefined; className?: string; style?: CSSProperties; alt?: string }) {
  if (!src) return null;
  return <img src={fileUrl(src)} alt={alt} className={className} style={style} loading="lazy" />;
}

export function EmptyState({ icon = 'sports_basketball', children }: { icon?: string; children: ReactNode }) {
  return (
    <div className="text-center py-16 text-muted border border-line rounded-lg">
      <span className="material-icons-round text-4xl block mb-3 text-line2">{icon}</span>
      {children}
    </div>
  );
}
