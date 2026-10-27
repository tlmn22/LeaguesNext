import 'server-only';
import { query, queryOne, scalar } from './db';
import { fileUrl, fmtDate } from './format';
import type { NewsCardData } from '@/components/public/lmn';

export type NewsItem = {
  id: number;
  title: string;
  excerpt: string | null;
  body: string | null;
  cover_image: string | null;
  published_at: string;
  league_name: string | null;
  league_slug: string | null;
  league_id: number | null;
};

export type NewsFull = NewsItem & { content: string | null };

// Нийтлэгдсэн, нийтлэх огноо нь болсон мэдээ л харагдана
const PUBLISHED = "n.status='published' AND n.published_at IS NOT NULL AND n.published_at <= app_now()";

const SELECT = `
  SELECT n.id, n.title, n.excerpt, LEFT(n.content, 400) AS body, n.cover_image, n.published_at,
         l.name AS league_name, l.slug AS league_slug, l.id AS league_id
  FROM news n
  LEFT JOIN seasons s ON s.id = n.season_id
  LEFT JOIN leagues l ON l.id = s.league_id`;

/** leagueId > 0 бол зөвхөн тухайн лигийн улирлуудад холбогдсон мэдээ */
export async function latestNews(limit: number, offset = 0, excludeId = 0, leagueId = 0): Promise<NewsItem[]> {
  return query<NewsItem>(
    `${SELECT} WHERE ${PUBLISHED} AND n.id<>? AND (?=0 OR l.id=?) ORDER BY n.published_at DESC, n.id DESC LIMIT ? OFFSET ?`,
    [excludeId, leagueId, leagueId, limit, offset],
  );
}

/** Тухайн улиралд холбогдсон мэдээ */
export async function seasonNews(seasonId: number, limit: number): Promise<NewsItem[]> {
  return query<NewsItem>(`${SELECT} WHERE ${PUBLISHED} AND n.season_id=? ORDER BY n.published_at DESC, n.id DESC LIMIT ?`, [seasonId, limit]);
}

export async function countNews(leagueId = 0): Promise<number> {
  return Number(await scalar(
    `SELECT COUNT(*) FROM news n LEFT JOIN seasons s ON s.id=n.season_id WHERE ${PUBLISHED} AND (?=0 OR s.league_id=?)`,
    [leagueId, leagueId],
  ));
}

export async function getNews(id: number): Promise<NewsFull | null> {
  return queryOne<NewsFull>(
    `SELECT n.id, n.title, n.excerpt, n.content, LEFT(n.content, 400) AS body, n.cover_image, n.published_at,
            l.name AS league_name, l.slug AS league_slug, l.id AS league_id
     FROM news n LEFT JOIN seasons s ON s.id = n.season_id LEFT JOIN leagues l ON l.id = s.league_id
     WHERE n.id=? AND ${PUBLISHED}`,
    [id],
  );
}

/** Товч тайлбар — excerpt байхгүй бол агуулгын эхнээс авна */
export function summary(n: Pick<NewsItem, 'excerpt' | 'body'>, max = 180): string {
  const t = (n.excerpt || n.body || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max).replace(/\s+\S*$/, '') + '…' : t;
}

export function toCard(n: NewsItem): NewsCardData {
  return {
    href: `/news/${n.id}`,
    league: n.league_name,
    date: fmtDate(n.published_at, 'Y.m.d'),
    title: n.title,
    excerpt: summary(n),
    image: n.cover_image ? fileUrl(n.cover_image) : null,
  };
}
