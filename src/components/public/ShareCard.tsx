'use client';
/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from 'react';

export type ShareAvg = {
  gp: number; pts: number; reb: number; ast: number; stl: number; mpg: string;
  fg_pct: number; t3_pct: number; ft_pct: number;
};

type Props = {
  ac: string;
  playerName: string;
  fileBase: string;
  photo: string | null;
  initial: string;
  leagueName: string;
  seasonName: string;
  teamName: string | null;
  position: string | null;
  jersey: string | null;
  avg: ShareAvg;
  variant?: 'button' | 'link';
};

export default function ShareCard(props: Props) {
  const { ac, avg } = props;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<'' | 'dl' | 'share'>('');
  const [status, setStatus] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  async function render(): Promise<HTMLCanvasElement> {
    setStatus('Зураг үүсгэж байна...');
    const html2canvas = (await import('html2canvas')).default;
    return html2canvas(cardRef.current!, { scale: 3, useCORS: true, backgroundColor: null, logging: false });
  }

  async function download() {
    setBusy('dl');
    try {
      const canvas = await render();
      const a = document.createElement('a');
      a.download = `${props.fileBase}_stat.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
      setStatus('✅ Татагдлаа!');
    } catch {
      setStatus('❌ Алдаа гарлаа.');
    }
    setBusy('');
  }

  async function share() {
    setBusy('share');
    try {
      const canvas = await render();
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
      if (!blob) throw new Error('blob');
      const file = new File([blob], `${props.fileBase}_stat.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${props.playerName} — Stat`,
          text: `${props.playerName} | ${props.seasonName} | leagues.mn`,
          files: [file],
        });
        setStatus('✅ Амжилттай!');
      } else {
        const a = document.createElement('a');
        a.download = file.name;
        a.href = URL.createObjectURL(blob);
        a.click();
        setStatus('📥 Татагдлаа (Share API дэмжихгүй)');
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setStatus('❌ Алдаа: ' + (e as Error).message);
    }
    setBusy('');
  }

  const trigger =
    props.variant === 'link' ? (
      <button type="button" onClick={() => setOpen(true)} className="hidden sm:flex items-center gap-1.5 text-primary-ink hover:text-primary">
        <span className="material-icons-round text-sm">share</span> Share
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-white transition-opacity hover:opacity-90"
        style={{ background: ac }}
      >
        <span className="material-icons-round text-base">share</span> Stat share
      </button>
    );

  return (
    <>
      {trigger}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.8)' }}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-raise rounded-2xl shadow-2xl max-w-sm w-full p-6 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-2xl uppercase">Stat Share</h3>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-line transition-colors" aria-label="Хаах">
                <span className="material-icons-round">close</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              {/* Зураг болгох хэсэг — html2canvas inline style-г хамгийн сайн дэмждэг */}
              <div
                ref={cardRef}
                style={{ width: 360, background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)', borderRadius: 20, padding: 28, fontFamily: 'var(--font-manrope), Manrope, sans-serif', position: 'relative', overflow: 'hidden' }}
              >
                <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', opacity: 0.25, background: ac }} />
                <div style={{ position: 'absolute', bottom: -40, left: -40, width: 150, height: 150, borderRadius: '50%', opacity: 0.15, background: ac }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, position: 'relative' }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: ac, textTransform: 'uppercase' }}>{props.leagueName}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{props.seasonName}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: 1 }}>leagues.mn</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22, position: 'relative' }}>
                  {props.photo ? (
                    <img src={props.photo} crossOrigin="anonymous" alt="" style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover', border: `3px solid ${ac}`, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 64, height: 64, borderRadius: 14, background: ac + '33', border: `3px solid ${ac}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: ac, flexShrink: 0 }}>
                      {props.initial}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: -0.5 }}>{props.playerName}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                      {props.position && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: ac, color: '#fff', letterSpacing: 1 }}>{props.position}</span>
                      )}
                      {props.jersey && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', color: '#94a3b8' }}>#{props.jersey}</span>
                      )}
                      {props.teamName && <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b' }}>{props.teamName}</span>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16, position: 'relative' }}>
                  {([[avg.pts, 'PTS'], [avg.reb, 'REB'], [avg.ast, 'AST'], [avg.stl, 'STL']] as const).map(([v, l]) => (
                    <div key={l} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: 26, fontWeight: 900, color: ac, lineHeight: 1 }}>{v}</div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 1.5, marginTop: 4, textTransform: 'uppercase' }}>{l}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 18, position: 'relative' }}>
                  {([[avg.fg_pct + '%', 'FG%'], [avg.t3_pct + '%', '3P%'], [avg.ft_pct + '%', 'FT%']] as const).map(([v, l]) => (
                    <div key={l} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 8, textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>{v}</div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 1, marginTop: 3 }}>{l}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.07)', position: 'relative' }}>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{avg.gp}</div>
                      <div style={{ fontSize: 8, fontWeight: 700, color: '#475569', letterSpacing: 1 }}>GAMES</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{avg.mpg}</div>
                      <div style={{ fontSize: 8, fontWeight: 700, color: '#475569', letterSpacing: 1 }}>MPG</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 8, fontWeight: 700, color: ac, letterSpacing: 2, textTransform: 'uppercase' }}>Season Averages</div>
                    <div style={{ width: 40, height: 2, background: ac, borderRadius: 2, marginTop: 4, marginLeft: 'auto' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                disabled={!!busy}
                onClick={download}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: ac }}
              >
                <span className={`material-icons-round text-base ${busy === 'dl' ? 'animate-spin' : ''}`}>{busy === 'dl' ? 'refresh' : 'download'}</span>
                {busy === 'dl' ? '' : 'Татах'}
              </button>
              <button
                type="button"
                disabled={!!busy}
                onClick={share}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border-2 transition-all hover:opacity-80 disabled:opacity-60"
                style={{ borderColor: ac, color: ac }}
              >
                <span className="material-icons-round text-base">share</span> Share
              </button>
            </div>
            {status && <div className="text-center text-xs text-muted mt-2">{status}</div>}
          </div>
        </div>
      )}
    </>
  );
}
