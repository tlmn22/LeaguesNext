import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fileUrl, fmtDate } from '@/lib/format';
import { getNews, latestNews, summary, toCard } from '@/lib/news';
import { upcomingGames } from '@/lib/upcoming';
import { leagueHref } from '@/components/public/LeagueCard';
import { Icon, NewsImage, NewsList, UpcomingPanel } from '@/components/public/lmn';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const n = await getNews(parseInt((await params).id, 10) || 0);
  if (!n) return { title: 'Мэдээ' };
  return {
    title: n.title,
    description: summary(n, 200),
    openGraph: { title: n.title, description: summary(n, 200), images: n.cover_image ? [fileUrl(n.cover_image)] : undefined },
  };
}

export default async function NewsDetail({ params }: { params: Promise<{ id: string }> }) {
  const n = await getNews(parseInt((await params).id, 10) || 0);
  if (!n) notFound();
  const [more, games] = await Promise.all([latestNews(5, 0, n.id), upcomingGames(3)]);
  // Хоосон мөрөөр тусгаарлагдсан догол мөрүүд
  const paragraphs = (n.content ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <main className="lmn-main">
      <Link href="/news" className="lmn-back"><Icon n="arrow_back" /> Бүх мэдээ</Link>
      <div className="lmn-body" style={{ marginTop: 0 }}>
        <article>
          <div className="lmn-art-meta">
            {n.league_name && (
              <Link href={leagueHref(n.league_slug, n.league_id ?? 0)} className="lmn-tag">{n.league_name}</Link>
            )}
            <span className="lmn-meta"><Icon n="calendar_today" /> {fmtDate(n.published_at, 'Y.m.d')}</span>
          </div>
          <h1 className="lmn-art-title">{n.title}</h1>
          {n.cover_image && (
            <figure className="lmn-art-cover">
              <NewsImage image={fileUrl(n.cover_image)} book={false} />
            </figure>
          )}
          <div className="lmn-prose">
            {n.excerpt && <p className="lead">{n.excerpt}</p>}
            {paragraphs.map((p, i) => (
              <p key={i} style={{ whiteSpace: 'pre-line' }}>{p}</p>
            ))}
          </div>
        </article>
        <aside className="lmn-aside">
          <NewsList title="Бусад мэдээ" items={more.map(toCard)} />
          <UpcomingPanel games={games} />
        </aside>
      </div>
    </main>
  );
}
