import { query } from '@/lib/db';
import { DAY_MN, accentOf, addDays, dayIndex, fileUrl, fmtDate, initials, todayUB, upper3 } from '@/lib/format';
import { latestNews, toCard } from '@/lib/news';
import { upcomingGames } from '@/lib/upcoming';
import { leagueHref } from '@/components/public/LeagueCard';
import {
  EmptyState, LeaguesPanel, NewsCard, NewsFeatured, NewsList, ResultsStrip, SectionHeader, UpcomingPanel,
  type LeagueRowData, type Result, type ResultDay,
} from '@/components/public/lmn';

export const dynamic = 'force-dynamic';

type Recent = {
  id: number; match_datetime: string; status: string; home_score: number | null; away_score: number | null;
  lg_name: string; ht: string; hl: string | null; hsn: string | null; at: string; al: string | null; asn: string | null;
};

type LeagueSeason = {
  id: number; name: string; slug: string | null; logo: string | null; primary_color: string | null;
  sid: number; sname: string; sstatus: string; team_cnt: number;
};

const MATCH_TEAMS = `
  JOIN seasons s ON s.id = m.season_id
  JOIN leagues l ON l.id = s.league_id
  JOIN season_teams hst ON hst.id = m.home_season_team_id
  JOIN season_teams ast ON ast.id = m.away_season_team_id
  JOIN teams ht ON ht.id = hst.team_id
  JOIN teams at2 ON at2.id = ast.team_id`;

export default async function HomePage() {
  const [recent, news, seasons, games] = await Promise.all([
    // Тоглолтын тууз: сүүлийн 7 хоногт дууссан (зүүн) → өнөөдөр → ирэх 7 хоногийн товлосон (баруун)
    query<Recent>(`
      SELECT m.id, m.match_datetime, m.status, m.home_score, m.away_score, l.name AS lg_name,
             ht.name AS ht, ht.logo_path AS hl, ht.short_name AS hsn,
             at2.name AS at, at2.logo_path AS al, at2.short_name AS asn
      FROM matches m ${MATCH_TEAMS}
      WHERE m.match_datetime < (app_now()::date + INTERVAL '8 days')
        AND ((m.status = 'finished' AND m.match_datetime >= (app_now()::date - INTERVAL '7 days'))
          OR m.status = 'live'
          OR (m.status = 'scheduled' AND m.match_datetime >= app_now()::date))
      ORDER BY m.match_datetime ASC, m.id ASC`),
    latestNews(9),
    // Бүх лигийн улирлууд — явагдаж буй нь эхэнд
    query<LeagueSeason>(`
      SELECT l.id, l.name, l.slug, l.logo, l.primary_color, s.id AS sid, s.name AS sname, s.status AS sstatus,
             COUNT(st.id) AS team_cnt
      FROM seasons s
      JOIN leagues l ON l.id = s.league_id
      LEFT JOIN season_teams st ON st.season_id = s.id
      GROUP BY l.id, s.id
      ORDER BY CASE s.status WHEN 'active' THEN 1 WHEN 'registration' THEN 2 ELSE 3 END, l.tier ASC, l.name ASC, s.id DESC`),
    upcomingGames(5),
  ]);

  const scored = (r: Recent) => r.status === 'finished' || r.status === 'live';
  const results: Result[] = recent.map((r) => ({
    href: `/match/${r.id}`,
    day: r.match_datetime.slice(0, 10),
    time: fmtDate(r.match_datetime, 'H:i'),
    status: r.status,
    league: r.lg_name,
    home: { abbr: upper3(r.hsn || r.ht), name: r.ht, score: scored(r) ? Number(r.home_score ?? 0) : null, logo: r.hl ? fileUrl(r.hl) : null },
    away: { abbr: upper3(r.asn || r.at), name: r.at, score: scored(r) ? Number(r.away_score ?? 0) : null, logo: r.al ? fileUrl(r.al) : null },
  }));
  // Өдрөөр бүлэглэнэ; өнөөдөр (эсвэл дараагийн тоглолттой өдөр) туузын голд байрлана
  const today = todayUB();
  const rel: Record<string, string> = { [addDays(today, -1)]: 'Өчигдөр', [today]: 'Өнөөдөр', [addDays(today, 1)]: 'Маргааш' };
  const days: ResultDay[] = [];
  for (const r of results) {
    let d = days[days.length - 1];
    if (!d || d.day !== r.day) {
      d = { day: r.day, weekday: rel[r.day] ?? DAY_MN[dayIndex(r.day)], label: fmtDate(r.day, 'm.d'), today: r.day === today, anchor: false, games: [] };
      days.push(d);
    }
    d.games.push(r);
  }
  const anchor = days.find((d) => d.day >= today);
  if (anchor) anchor.anchor = true;
  const leagues: LeagueRowData[] = seasons.map((l) => ({
    href: leagueHref(l.slug, l.id, l.sid),
    name: l.name,
    season: l.sname,
    abbr: initials(l.name),
    logo: l.logo ? fileUrl(l.logo) : null,
    color: accentOf(l.primary_color),
    status: l.sstatus,
    teams: l.team_cnt,
  }));
  const [feature, ...rest] = news.map(toCard);

  return (
    <main className="lmn-main">
      <ResultsStrip days={days} />
      <div className="lmn-body">
        <section className="lmn-stack">
          <SectionHeader title="Мэдээ" linkLabel="Бүх мэдээ →" href="/news" />
          {!feature ? (
            <div className="lmn-card">
              <EmptyState icon="newspaper" title="Мэдээ байхгүй байна" text="Шинэ мэдээ нийтлэгдэхэд энд харагдана." />
            </div>
          ) : (
            <>
              <NewsFeatured n={feature} />
              {rest.length > 0 && (
                <div className="lmn-pair">
                  {rest.slice(0, 2).map((n) => <NewsCard key={n.href} n={n} />)}
                </div>
              )}
              {rest.length > 2 && <NewsList items={rest.slice(2)} />}
            </>
          )}
        </section>
        <aside className="lmn-aside">
          <LeaguesPanel leagues={leagues} />
          <UpcomingPanel games={games} />
        </aside>
      </div>
    </main>
  );
}
