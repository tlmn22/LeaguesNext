/* eslint-disable @next/next/no-img-element */
import type { Bracket, PTeam, Series } from '@/lib/playoff';
import { fileUrl, initials, tc } from '@/lib/format';

function Logo({ t }: { t: PTeam }) {
  return t.logo ? <img src={fileUrl(t.logo)} alt="" className="po-logo" /> : <span className="po-logo">{initials(tc(t.name))}</span>;
}

function Row({ t, wins, s }: { t: PTeam | null; wins: number; s: Series }) {
  if (!t) {
    return (
      <div className="po-team is-tbd">
        <span className="po-seed" />
        <span className="po-logo">?</span>
        <span className="po-name">{s.bye ? 'Өрсөлдөгчгүй' : 'Тодорхойгүй'}</span>
        <span />
      </div>
    );
  }
  const state = s.winner ? (s.winner.stid === t.stid ? 'is-win' : 'is-lose') : '';
  return (
    <div className={`po-team ${state}`}>
      <span className="po-seed">{t.seed}</span>
      <Logo t={t} />
      <span className="po-name">{tc(t.name)}</span>
      <span className="po-wins">{s.bye || (!s.games.length && !s.winner) ? '' : wins}</span>
    </div>
  );
}

/** Цувралын доод мөр: "Best of 5 · 2-р тоглолт шууд" гэх мэт */
function meta(s: Series): [string, string?] {
  const bo = s.bestOf === 1 ? '1 тоглолт' : `Best of ${s.bestOf}`;
  if (s.bye) return ['Тоглолтгүй дараагийн шатанд'];
  if (s.winner) return [bo, `${Math.max(s.winsA, s.winsB)}–${Math.min(s.winsA, s.winsB)}`];
  const live = s.games.findIndex((g) => g.status === 'live');
  if (live >= 0) return [bo, `${live + 1}-р тоглолт · Шууд`];
  if (s.a && s.b && (s.winsA || s.winsB)) {
    const lead = s.winsA === s.winsB ? 'Тэнцүү' : `${tc((s.winsA > s.winsB ? s.a : s.b).name)} тэргүүлж байна`;
    return [bo, lead];
  }
  return [bo];
}

function Card({ s }: { s: Series }) {
  const [left, right] = meta(s);
  const body = (
    <>
      <Row t={s.a} wins={s.winsA} s={s} />
      <Row t={s.b} wins={s.winsB} s={s} />
      <div className="po-meta">
        <span>{left}</span>
        {right && <span className={right.includes('Шууд') ? 'is-live' : ''}>{right}</span>}
      </div>
    </>
  );
  return s.games.length ? <a href={`#${s.key}`} className="po-card">{body}</a> : <div className="po-card">{body}</div>;
}

/** Шатлан явдаг сүлжээ: шат бүр нэг багана, хамгийн сүүлд аварга */
export default function PlayoffBracket({ bracket, ac }: { bracket: Bracket; ac: string }) {
  const { rounds, champion } = bracket;
  const last = rounds.length - 1;
  return (
    <div className="po-wrap">
      <div className="po" style={{ '--ac': ac } as React.CSSProperties}>
        {rounds.map((r, ri) => (
          <div key={r.name} className={`po-col has-out ${ri > 0 ? 'has-in' : ''} ${ri === last ? 'is-final' : ''}`}>
            <div className="po-head">
              <b>{r.name}</b>
              <span>{r.bestOf === 1 ? '1 тоглолт' : `Best of ${r.bestOf}`}</span>
            </div>
            <div className="po-body">
              {r.series.map((s) => {
                const fed = ri > 0 && !!(s.a || s.b);
                return (
                  <div key={s.key} className={`po-item ${s.winner ? 'is-done' : ''} ${fed ? 'is-fed' : ''} ${s.empty ? 'is-blank' : ''}`}>
                    {!s.empty && <Card s={s} />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div className="po-col has-in is-champ">
          <div className="po-head"><b>Аварга</b></div>
          <div className="po-body">
            <div className={`po-item ${champion ? 'is-fed' : ''}`}>
              <div className={`po-champ ${champion ? '' : 'is-tbd'}`}>
                <span className="mi" aria-hidden="true">emoji_events</span>
                {champion ? (
                  <>
                    <Logo t={champion} />
                    <b>{tc(champion.name)}</b>
                  </>
                ) : (
                  <b className="!text-[color:var(--lm-muted)]">?</b>
                )}
                <small>{champion ? 'Аварга' : 'Тодроогүй'}</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
