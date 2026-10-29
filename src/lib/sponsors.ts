import 'server-only';
import { query } from './db';

export type Sponsor = { id: number; name: string; logo: string | null; url: string | null; tier: 'title' | 'sponsor' | 'partner'; sort_order: number };

export const SPONSOR_TIERS: [Sponsor['tier'], string][] = [
  ['title', 'Ерөнхий спонсор'],
  ['sponsor', 'Спонсор'],
  ['partner', 'Хамтрагч'],
];

/** Улирлын спонсорууд — ангилал, дараалал, нэрээр */
export async function seasonSponsors(seasonId: number): Promise<Sponsor[]> {
  try {
    return await query<Sponsor>(
      `SELECT id, name, logo, url, tier, sort_order FROM season_sponsors WHERE season_id=?
       ORDER BY CASE tier WHEN 'title' THEN 1 WHEN 'sponsor' THEN 2 ELSE 3 END, sort_order, name`,
      [seasonId],
    );
  } catch (e) {
    // Хүснэгт хараахан үүсээгүй (database/2026-10-29-season-sponsors.sql) бол хуудсыг эвдэхгүй
    if ((e as { code?: string }).code === '42P01') return [];
    throw e;
  }
}
