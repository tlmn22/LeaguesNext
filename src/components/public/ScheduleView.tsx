/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { query } from '@/lib/db';
import { accentOf, dayIndex, fileUrl, fmtDate, initials, todayUB } from '@/lib/format';
import { EmptyState, Icon } from '@/components/public/lmn';

type Row = {
  id: number; match_datetime: string; status: string; home_score: number | null; away_score: number | null; arena_name: string | null;
  lid: number; lg_name: string; primary_color: string | null; sid: number; sname: string;
  hstid: number; astid: number; ht: string; hl: string | null; at: string; al: string | null;
};
type RecordRow = { id: number; season_id: number; zone: string | null; wins: number; losses: number; pf: number; pa: number };
type TeamRecord = { wins: number; losses: number; rank: number };
const DAYS = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
const limitOf = (value?: string) => Math.max(40, Number.parseInt(value ?? '', 10) || 40);

function Team({ name, logo, record, winner, side }: { name: string; logo: string | null; record?: TeamRecord; winner: boolean; side: 'home' | 'away' }) {
  return (
    <span className={`sc-team sc-team-${side}${winner ? ' is-winner' : ''}`}>
      <span className="sc-team-logo">{logo ? <img src={fileUrl(logo)} alt="" /> : initials(name)}</span>
      <span className="sc-team-copy">
        <span className="sc-team-name">{name}{winner && <Icon n="check_circle" className="sc-winner" />}</span>
        {record && <span className="sc-team-record">{record.wins}–{record.losses} <span>· #{record.rank}</span></span>}
      </span>
    </span>
  );
}

function MatchCard({ m, records }: { m: Row; records: Map<number, TeamRecord> }) {
  const finished = m.status === 'finished';
  const live = m.status === 'live';
  const cancelled = m.status === 'cancelled';
  const scored = finished || live;
  return (
    <Link href={`/match/${m.id}`} className={`sc-match${live ? ' is-live' : ''}`}>
      <span className="sc-match-top">
        <span className={`sc-status${live ? ' is-live' : ''}`}>
          {live && <span className="lmn-pulse is-live" />}
          {finished ? 'Дууссан' : live ? 'Шууд' : cancelled ? 'Цуцлагдсан' : fmtDate(m.match_datetime, 'H:i')}
        </span>
        <span className="sc-league-label" style={{ color: accentOf(m.primary_color) }}>{m.lg_name} <span>· {m.sname}</span></span>
      </span>
      <span className="sc-match-body">
        <Team name={m.ht} logo={m.hl} record={records.get(m.hstid)} winner={finished && Number(m.home_score) > Number(m.away_score)} side="home" />
        <span className={`sc-score${scored ? ' has-score' : ''}`}>
          {scored ? <><span>{m.home_score ?? 0}</span><i>–</i><span>{m.away_score ?? 0}</span></> : cancelled ? '—' : 'VS'}
        </span>
        <Team name={m.at} logo={m.al} record={records.get(m.astid)} winner={finished && Number(m.away_score) > Number(m.home_score)} side="away" />
      </span>
      {m.arena_name && <span className="sc-venue"><Icon n="location_on" />{m.arena_name}</span>}
    </Link>
  );
}

function MatchDays({ rows, records, today }: { rows: Row[]; records: Map<number, TeamRecord>; today: string }) {
  const days = new Map<string, Row[]>();
  for (const m of rows) {
    const date = m.match_datetime.slice(0, 10);
    if (!days.has(date)) days.set(date, []);
    days.get(date)!.push(m);
  }
  return [...days].map(([date, games]) => (
    <section className="sc-day" key={date}>
      <div className="sc-day-heading">
        <h3>{fmtDate(date, 'Y.m.d')} <span>· {DAYS[dayIndex(date)]}</span></h3>
        <span className="sc-day-count">{date === today && <b>Өнөөдөр</b>}{games.length} тоглолт</span>
      </div>
      <div className="sc-matches">{games.map((m) => <MatchCard key={m.id} m={m} records={records} />)}</div>
    </section>
  ));
}

type Props = {
  leagueId?: number;
  seasonId?: number;
  date: string;
  filter?: 'all' | 'done' | 'upcoming';
  label: string;
  basePath: string;
  baseParams: Record<string, string>;
  past?: string;
  upcoming?: string;
  filters: ReactNode;
  withinLeague?: boolean;
};

export default async function ScheduleView({ leagueId = 0, seasonId, date, filter = 'all', label, basePath, baseParams, past, upcoming: upcomingParam, filters, withinLeague = false }: Props) {
  const Heading = withinLeague ? 'h2' : 'h1';
  const today = todayUB();
  const allRows = await query<Row>(
    `SELECT m.id, m.match_datetime, m.status, m.home_score, m.away_score, m.arena_name,
            l.id AS lid, l.name AS lg_name, l.primary_color, s.id AS sid, s.name AS sname,
            hst.id AS hstid, ast.id AS astid, ht.name AS ht, ht.logo_path AS hl, at2.name AS at, at2.logo_path AS al
     FROM matches m JOIN seasons s ON s.id=m.season_id JOIN leagues l ON l.id=s.league_id
     JOIN season_teams hst ON hst.id=m.home_season_team_id JOIN season_teams ast ON ast.id=m.away_season_team_id
     JOIN teams ht ON ht.id=hst.team_id JOIN teams at2 ON at2.id=ast.team_id
     WHERE m.match_datetime IS NOT NULL AND (?=0 OR l.id=?) AND (?::int IS NULL OR s.id=?) AND (?='' OR m.match_datetime::date=?::text::date)
     ORDER BY m.match_datetime DESC, m.id DESC`,
    [leagueId, leagueId, seasonId ?? null, seasonId ?? null, date, date || null],
  );
  const rows = allRows.filter((m) => filter === 'done' ? m.status === 'finished' : filter === 'upcoming' ? m.status === 'scheduled' || m.status === 'live' : true);
  const isUpcoming = (m: Row) => m.status === 'live' || (m.status === 'scheduled' && m.match_datetime.slice(0, 10) >= today);
  const upcoming = rows.filter(isUpcoming).sort((a, b) => a.match_datetime.localeCompare(b.match_datetime) || a.id - b.id);
  // Dates descend; fixtures within each date remain in chronological order.
  const previous = rows.filter((m) => !isUpcoming(m)).sort((a, b) => b.match_datetime.slice(0, 10).localeCompare(a.match_datetime.slice(0, 10)) || a.match_datetime.localeCompare(b.match_datetime) || a.id - b.id);
  const upcomingLimit = limitOf(upcomingParam);
  const pastLimit = limitOf(past);
  const visibleUpcoming = upcoming.slice(0, upcomingLimit);
  const visiblePrevious = previous.slice(0, pastLimit);
  const seasonIds = [...new Set([...visibleUpcoming, ...visiblePrevious].map((m) => m.sid))];
  const records = new Map<number, TeamRecord>();
  if (seasonIds.length) {
    const standings = await query<RecordRow>(
      `SELECT st.id, st.season_id, st.zone,
          SUM(CASE WHEN (m.home_season_team_id=st.id AND m.home_score>m.away_score) OR (m.away_season_team_id=st.id AND m.away_score>m.home_score) THEN 1 ELSE 0 END) AS wins,
          SUM(CASE WHEN (m.home_season_team_id=st.id AND m.home_score<m.away_score) OR (m.away_season_team_id=st.id AND m.away_score<m.home_score) THEN 1 ELSE 0 END) AS losses,
          COALESCE(SUM(CASE WHEN m.home_season_team_id=st.id THEN m.home_score ELSE m.away_score END),0) AS pf,
          COALESCE(SUM(CASE WHEN m.home_season_team_id=st.id THEN m.away_score ELSE m.home_score END),0) AS pa
       FROM season_teams st LEFT JOIN matches m ON m.season_id=st.season_id
          AND (m.home_season_team_id=st.id OR m.away_season_team_id=st.id)
          AND m.status='finished' AND COALESCE(m.stage,'regular')<>'playoff'
       WHERE st.season_id IN (?) GROUP BY st.id
       ORDER BY st.season_id, st.zone, wins DESC, (COALESCE(SUM(CASE WHEN m.home_season_team_id=st.id THEN m.home_score-m.away_score ELSE m.away_score-m.home_score END),0)) DESC, pf DESC, st.id`,
      [seasonIds],
    );
    const ranks = new Map<string, number>();
    for (const r of standings) {
      const key = `${r.season_id}:${r.zone ?? ''}`;
      const rank = (ranks.get(key) ?? 0) + 1;
      ranks.set(key, rank);
      records.set(r.id, { wins: Number(r.wins), losses: Number(r.losses), rank });
    }
  }
  const href = (changes: Record<string, string | number> = {}) => {
    const params = new URLSearchParams(baseParams);
    if (date) params.set('d', date);
    if (upcomingLimit > 40) params.set('upcoming', String(upcomingLimit));
    if (pastLimit > 40) params.set('past', String(pastLimit));
    for (const [key, value] of Object.entries(changes)) {
      if (value === '') params.delete(key); else params.set(key, String(value));
    }
    return `${basePath}${params.size ? '?' + params : ''}`;
  };
  const finished = rows.filter((m) => m.status === 'finished').length;
  return (
    <main className="sc-page">
      <header className="sc-heading">
        <p className="sc-eyebrow">{label} · {rows.length} тоглолт · {finished} дууссан</p>
        <Heading>Тоглолтууд <span>ба үр дүн</span></Heading>
      </header>
      {filters}
      {!rows.length ? <div className="lmn-card"><EmptyState icon="event_busy" title="Тоглолт олдсонгүй" text="Сонгосон шүүлтүүрт тохирох тоглолт бүртгэгдээгүй байна." /></div> : (
        <>
          <section className="sc-section" id="upcoming">
            <div className="sc-section-heading"><h2><Icon n="event" />Дараагийн тоглолтууд</h2><span>{upcoming.length}</span></div>
            {upcoming.length ? <MatchDays rows={visibleUpcoming} records={records} today={today} /> : <p className="sc-section-empty">Удахгүй болох тоглолт одоогоор алга.</p>}
            {upcoming.length > upcomingLimit && <Link className="sc-more" href={href({ upcoming: upcomingLimit + 40 }) + '#upcoming'}>Бусад тоглолтыг харах <Icon n="expand_more" /></Link>}
          </section>
          <section className="sc-section" id="previous">
            <div className="sc-section-heading"><h2><Icon n="history" />Өмнөх тоглолтууд</h2><span>{previous.length}</span></div>
            {previous.length ? <MatchDays rows={visiblePrevious} records={records} today={today} /> : <p className="sc-section-empty">Өмнөх тоглолт одоогоор алга.</p>}
            {previous.length > pastLimit && <Link className="sc-more" href={href({ past: pastLimit + 40 }) + '#previous'}>Өмнөх тоглолтуудыг нэмж харах <Icon n="expand_more" /></Link>}
          </section>
        </>
      )}
    </main>
  );
}
