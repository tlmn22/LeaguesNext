'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Sponsor } from '@/lib/sponsors';
import { fileUrl } from '@/lib/format';

const TIERS: [Sponsor['tier'], string][] = [
  ['title', 'Ерөнхий спонсор'],
  ['sponsor', 'Спонсор'],
  ['partner', 'Хамтрагч'],
];
const SPEED = 45; // px/сек

function Logo({ s, hidden }: { s: Sponsor; hidden?: boolean }) {
  const inner = s.logo ? <img src={fileUrl(s.logo)} alt={hidden ? '' : s.name} loading="lazy" /> : <span className="lg-sp-name">{s.name}</span>;
  return s.url ? (
    <a href={s.url} target="_blank" rel="noopener noreferrer sponsored" className="lg-sp-logo" title={s.name} tabIndex={hidden ? -1 : undefined}>{inner}</a>
  ) : (
    <span className="lg-sp-logo" title={s.name}>{inner}</span>
  );
}

/**
 * Улирлын спонсорууд — хар тууз. Байгууллага бүр нэг л удаа; дэлгэцэнд багтвал хөдөлгөөнгүй (голлуулна),
 * багтахгүй бол баруунаас зүүн тийш гүйнэ. Гүйх үед заадасгүй эргэлдэхийн тулд 2-р хувь нэмэгдэх ч
 * агуулга дэлгэцээс өргөн тул нэг байгууллага нэгэн зэрэг хоёр харагдахгүй.
 */
export default function SponsorStrip({ sponsors }: { sponsors: Sponsor[] }) {
  const wrap = useRef<HTMLElement>(null);
  const set = useRef<HTMLDivElement>(null);
  const [moving, setMoving] = useState(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const w = wrap.current;
    const s = set.current;
    if (!w || !s) return;
    const measure = () => {
      setWidth(s.scrollWidth);
      setMoving(s.scrollWidth > w.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(w);
    ro.observe(s);
    return () => ro.disconnect();
  }, [sponsors]);

  if (!sponsors.length) return null;
  const groups = TIERS.map(([tier, label]) => ({ tier, label, list: sponsors.filter((s) => s.tier === tier) })).filter((g) => g.list.length);
  const content = (hidden: boolean) =>
    groups.map((g) => (
      <div key={g.tier} className={`lg-sp-group is-${g.tier}`}>
        <div className="lg-sp-label">{g.label}</div>
        <div className="lg-sp-row">
          {g.list.map((s) => <Logo key={s.id} s={s} hidden={hidden} />)}
        </div>
      </div>
    ));

  return (
    <section
      ref={wrap}
      className={`lg-sponsors${moving ? ' is-moving' : ''}`}
      aria-label="Спонсорууд"
      style={{ '--sp-dur': `${Math.max(12, Math.round(width / SPEED))}s` } as CSSProperties}
    >
      <div className="lg-sp-track">
        <div ref={set} className="lg-sp-set">{content(false)}</div>
        {moving && <div className="lg-sp-set" aria-hidden="true">{content(true)}</div>}
      </div>
    </section>
  );
}
