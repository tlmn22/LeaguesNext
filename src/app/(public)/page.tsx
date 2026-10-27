import { query } from '@/lib/db';
import { accentOf, fileUrl, fmtDate, initials, upper3 } from '@/lib/format';
import { latestNews, toCard } from '@/lib/news';
import { upcomingGames } from '@/lib/upcoming';
import { leagueHref } from '@/components/public/LeagueCard';
import {
  EmptyState, LeaguesPanel, NewsCard, NewsFeatured, NewsList, ResultsStrip, SectionHeader, UpcomingPanel,
  type LeagueRowData, type Result,
} from '@/components/public/lmn';

export const dynamic = 'force-dynamic';

type Recent = {
  id: number; match_datetime: string; home_score: number; away_score: number;
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
    // Сүүлийн 7 хоногт болсон дууссан тоглолтууд — хамгийн сүүлийнх нь эхэнд
    query<Recent>(`
      SELECT m.id, m.match_datetime, m.home_score, m.away_score, l.name AS lg_name,
             ht.name AS ht, ht.logo_path AS hl, ht.short_name AS hsn,
             at2.name AS at, at2.logo_path AS al, at2.short_name AS asn
      FROM matches m ${MATCH_TEAMS}
      WHERE m.status = 'finished' AND m.match_datetime >= (app_now() - INTERVAL '7 days')
      ORDER BY m.match_datetime DESC`),
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

  const results: Result[] = recent.map((r) => ({
    href: `/match/${r.id}`,
    date: fmtDate(r.match_datetime, 'm.d'),
    league: r.lg_name,
    home: { abbr: upper3(r.hsn || r.ht), name: r.ht, score: r.home_score, logo: r.hl ? fileUrl(r.hl) : null },
    away: { abbr: upper3(r.asn || r.at), name: r.at, score: r.away_score, logo: r.al ? fileUrl(r.al) : null },
  }));
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
      <ResultsStrip results={results} />
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
