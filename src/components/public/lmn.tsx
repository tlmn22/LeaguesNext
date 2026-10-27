/* eslint-disable @next/next/no-img-element */
// LeagueMN design system-ийн component-ууд (LeagueMN/components/bundle.js-ийн хувилбар). Класс нь src/app/lmn.css-д.
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

export function Icon({ n, className }: { n: string; className?: string }) {
  return <span className={cx('mi', className)} aria-hidden="true">{n}</span>;
}

export function Logo() {
  return (
    <Link href="/" className="lmn-logo" aria-label="LeagueMN — Нүүр">
      League<em>MN</em>
      <i />
    </Link>
  );
}

export function SectionHeader({ title, linkLabel, href, as: H = 'h2' }: { title: string; linkLabel?: string; href?: string; as?: 'h1' | 'h2' | 'h3' }) {
  return (
    <div className="lmn-sh">
      <H>{title}</H>
      {linkLabel && href && <Link className="lmn-link" href={href}>{linkLabel}</Link>}
    </div>
  );
}

export function EmptyState({ icon = 'inbox', title, text, compact }: { icon?: string; title: string; text?: string; compact?: boolean }) {
  return (
    <div className={cx('lmn-empty', compact && 'is-compact')}>
      <span className="lmn-empty-ic"><Icon n={icon} /></span>
      <b>{title}</b>
      {text && <p>{text}</p>}
    </div>
  );
}

/* ---------- results ---------- */

export type ResultTeam = { abbr: string; name: string; score: number; logo?: string | null };
export type Result = { href: string; date: string; league: string; home: ResultTeam; away: ResultTeam };

function TeamLine({ t, state }: { t: ResultTeam; state: 'winner' | 'loser' | null }) {
  return (
    <div className={cx('lmn-team', state && `is-${state}`)}>
      <span className="lmn-team-logo" style={{ background: t.logo ? 'var(--lmn-sunken)' : '#595d6c', overflow: 'hidden' }} aria-hidden="true">
        {t.logo ? <img src={t.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : t.abbr[0]}
      </span>
      <span className="lmn-team-abbr" title={t.name}>{t.abbr}</span>
      <span className="lmn-team-score">{t.score}</span>
    </div>
  );
}

export function ResultsStrip({ results }: { results: Result[] }) {
  return (
    <section>
      <SectionHeader title="Сүүлд болсон тоглолтууд" linkLabel="Бүх хуваарь →" href="/schedule" />
      {results.length === 0 ? (
        <div className="lmn-card">
          <EmptyState icon="sports_basketball" title="Сүүлийн 7 хоногт тоглолт болоогүй" compact />
        </div>
      ) : (
        <div className="lmn-strip-wrap">
          <div className="lmn-strip" role="list">
            {results.map((r) => {
              const hw = r.home.score > r.away.score;
              const aw = r.away.score > r.home.score;
              return (
                <Link key={r.href} href={r.href} role="listitem" className="lmn-card lmn-result" aria-label={`${r.home.abbr} ${r.home.score}, ${r.away.abbr} ${r.away.score}`}>
                  <div className="lmn-result-h"><span>{r.date}</span>·<b>{r.league}</b></div>
                  <TeamLine t={r.home} state={hw ? 'winner' : aw ? 'loser' : null} />
                  <TeamLine t={r.away} state={aw ? 'winner' : hw ? 'loser' : null} />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- news ---------- */

export type NewsCardData = { href: string; league: string | null; date: string; title: string; excerpt?: string; image: string | null };

export function NewsImage({ image, date, book = true }: { image: string | null; date?: string; book?: boolean }) {
  return (
    <div className="lmn-media">
      {image ? <img src={image} alt="" loading="lazy" /> : <div className="lmn-media-ph"><Icon n="newspaper" /></div>}
      {date && <span className="lmn-date-pill"><Icon n="calendar_today" />{date}</span>}
      {book && <span className="lmn-book" aria-hidden="true"><Icon n="menu_book" /></span>}
    </div>
  );
}

export function NewsFeatured({ n }: { n: NewsCardData }) {
  return (
    <Link href={n.href} className="lmn-card lmn-hover lmn-feat">
      <NewsImage image={n.image} date={n.date} />
      <div className="lmn-feat-body">
        {n.league && <span className="lmn-tag">{n.league}</span>}
        <h3 className="lmn-feat-title lmn-t clamp-2" title={n.title}>{n.title}</h3>
        {n.excerpt && <p className="lmn-excerpt clamp-2">{n.excerpt}</p>}
        <span className="lmn-link">Дэлгэрэнгүй ›</span>
      </div>
    </Link>
  );
}

export function NewsCard({ n }: { n: NewsCardData }) {
  return (
    <Link href={n.href} className="lmn-card lmn-hover lmn-ncard">
      <NewsImage image={n.image} date={n.date} />
      <div className="lmn-ncard-body">
        {n.league && <span className="lmn-tag">{n.league}</span>}
        <h3 className="lmn-ncard-title lmn-t clamp-2" title={n.title}>{n.title}</h3>
        <span className="lmn-link">Дэлгэрэнгүй ›</span>
      </div>
    </Link>
  );
}

export function NewsRow({ n }: { n: NewsCardData }) {
  return (
    <Link href={n.href} className="lmn-row">
      <span className="lmn-thumb">{n.image ? <img src={n.image} alt="" loading="lazy" /> : <Icon n="newspaper" />}</span>
      <span>
        <h4 className="lmn-row-title lmn-t clamp-2" title={n.title}>{n.title}</h4>
        <span className="lmn-meta">{n.league ? `${n.date} · ${n.league}` : n.date}</span>
      </span>
      <Icon n="chevron_right" className="lmn-chev" />
    </Link>
  );
}

export function NewsList({ items, title, linkLabel = 'Бүх мэдээ →' }: { items: NewsCardData[]; title?: string; linkLabel?: string | false }) {
  return (
    <div className="lmn-card">
      {title && <div className="lmn-panel-h"><h3>{title}</h3></div>}
      {items.length ? (
        <div className="lmn-list">
          {items.map((n) => <NewsRow key={n.href} n={n} />)}
        </div>
      ) : (
        <EmptyState icon="newspaper" title="Мэдээ байхгүй байна" compact />
      )}
      {linkLabel !== false && items.length > 0 && (
        <div className="lmn-card-foot"><Link className="lmn-link" href="/news">{linkLabel}</Link></div>
      )}
    </div>
  );
}

/* ---------- sidebar ---------- */

function Panel({ title, live, empty, foot, children }: { title: string; live?: boolean; empty?: ReactNode; foot?: [string, string]; children?: ReactNode }) {
  return (
    <section className="lmn-card">
      <div className="lmn-panel-h">
        <h3>{title}</h3>
        {live && <span className="lmn-pulse" role="img" aria-label="Шууд" />}
      </div>
      {empty ? empty : <div className="lmn-panel-body">{children}</div>}
      {!empty && foot && (
        <div className="lmn-card-foot"><Link className="lmn-link" href={foot[1]}>{foot[0]}</Link></div>
      )}
    </section>
  );
}

export type LeagueRowData = { href: string; name: string; season: string; abbr: string; logo: string | null; color: string; status: string; teams: number };

const SEASON_STATUS: Record<string, [string, string]> = {
  active: ['Явагдаж байна', 'var(--lmn-active-text)'],
  registration: ['Бүртгэл', 'var(--lmn-scheduled)'],
  finished: ['Дууссан', 'var(--lmn-text-secondary)'],
};

export function LeagueRow({ l }: { l: LeagueRowData }) {
  const [label, color] = SEASON_STATUS[l.status] ?? SEASON_STATUS.finished;
  return (
    <Link href={l.href} className="lmn-prow" style={{ '--lc': l.color } as CSSProperties}>
      <span className="lmn-ltile">{l.logo ? <img src={l.logo} alt="" /> : <span>{l.abbr}</span>}</span>
      <span style={{ minWidth: 0 }}>
        <h4 className="lmn-lname lmn-t" title={l.name}>{l.name}</h4>
        <span className="lmn-lseason" style={{ display: 'block' }}>{l.season}</span>
        <span className="lmn-pnum" style={{ display: 'block', marginTop: 2 }}>
          <b style={{ color }}>{label}</b> · {l.teams} баг
        </span>
      </span>
      <Icon n="chevron_right" className="lmn-chev" />
    </Link>
  );
}

export function LeaguesPanel({ leagues }: { leagues: LeagueRowData[] }) {
  return (
    <Panel
      title="Лигүүд"
      live={leagues.some((l) => l.status === 'active')}
      foot={['Бүх лиг ›', '/leagues']}
      empty={!leagues.length && <EmptyState icon="emoji_events" title="Лиг алга" text="Шинэ лиг нэмэгдэхэд энд харагдана." compact />}
    >
      {leagues.map((l) => <LeagueRow key={l.href} l={l} />)}
    </Panel>
  );
}

export type UpcomingData = { href: string; day: string; time: string; home: string; away: string; homeName: string; awayName: string; league: string };

export function UpcomingPanel({ games }: { games: UpcomingData[] }) {
  return (
    <Panel
      title="Удахгүй болох тоглолтууд"
      foot={['Бүх хуваарь ›', '/schedule']}
      empty={!games.length && <EmptyState icon="event_busy" title="Товлогдсон тоглолт алга" compact />}
    >
      {games.map((g) => (
        <Link key={g.href} href={g.href} className="lmn-prow">
          <span className="lmn-dt"><b>{g.day}</b><span>{g.time}</span></span>
          <span style={{ minWidth: 0 }}>
            <p className="lmn-vs lmn-t">
              <abbr title={g.homeName} style={{ textDecoration: 'none' }}>{g.home}</abbr>
              <span>vs</span>
              <abbr title={g.awayName} style={{ textDecoration: 'none' }}>{g.away}</abbr>
            </p>
            <span className="lmn-lseason" style={{ display: 'block' }}>{g.league}</span>
          </span>
          <Icon n="chevron_right" className="lmn-chev" />
        </Link>
      ))}
    </Panel>
  );
}
