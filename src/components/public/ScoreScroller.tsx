'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Тоглолтын туузыг хоёр тийш гүйлгэнэ. Ачаалахад [data-anchor] (өнөөдөр эсвэл
 * дараагийн тоглолтын өдөр) голд нь байрлана.
 */
export default function ScoreScroller({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const anchor = el.querySelector<HTMLElement>('[data-anchor]');
    if (anchor) {
      // Snap-ийг түр унтраана — эс бөгөөс гол руу биш хамгийн ойрын эхлэл рүү үсэрнэ
      el.style.scrollSnapType = 'none';
      el.scrollLeft = anchor.offsetLeft - el.offsetLeft - el.clientWidth / 2 + 160;
      requestAnimationFrame(() => (el.style.scrollSnapType = ''));
    } else {
      el.scrollLeft = el.scrollWidth;
    }
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [update]);

  const go = (dir: -1 | 1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  return (
    <div className="lmn-strip-wrap">
      <button type="button" className="lmn-strip-btn is-prev" onClick={() => go(-1)} disabled={edge.start} aria-label="Өмнөх тоглолтууд">
        <span className="mi" aria-hidden="true">chevron_left</span>
      </button>
      <div ref={ref} className="lmn-strip" role="list">
        {children}
      </div>
      <button type="button" className="lmn-strip-btn is-next" onClick={() => go(1)} disabled={edge.end} aria-label="Дараагийн тоглолтууд">
        <span className="mi" aria-hidden="true">chevron_right</span>
      </button>
    </div>
  );
}
