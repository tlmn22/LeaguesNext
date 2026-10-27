import type { Metadata } from 'next';
import { getLeagueCtx } from '@/lib/league';
import { countNews, latestNews, toCard } from '@/lib/news';
import LeagueShell from '@/components/league/LeagueShell';
import { EmptyState, NewsCard, NewsFeatured, SectionHeader } from '@/components/public/lmn';
import Pager from '@/components/admin/Pager';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ slug: string }>; searchParams: Promise<{ s?: string; p?: string }> };

const PER_PAGE = 13;

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const ctx = await getLeagueCtx((await params).slug, (await searchParams).s);
  return { title: `Мэдээ — ${ctx.lg.name}` };
}

export default async function LeagueNews({ params, searchParams }: P) {
  const sp = await searchParams;
  const ctx = await getLeagueCtx((await params).slug, sp.s);
  const total = await countNews(ctx.lg.id);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(pages, Math.max(1, parseInt(sp.p ?? '', 10) || 1));
  const items = (await latestNews(PER_PAGE, (page - 1) * PER_PAGE, 0, ctx.lg.id)).map(toCard);
  const feature = page === 1 ? items[0] : undefined;
  const rest = feature ? items.slice(1) : items;

  return (
    <LeagueShell ctx={ctx} active="news">
      <main className="lmn-main">
        <SectionHeader title="Мэдээ" />
        {items.length === 0 ? (
          <div className="lmn-card">
            <EmptyState icon="newspaper" title="Мэдээ байхгүй байна" text="Энэ лигийн мэдээ нийтлэгдэхэд энд харагдана." />
          </div>
        ) : (
          <div className="lmn-stack">
            {feature && <NewsFeatured n={feature} />}
            {rest.length > 0 && (
              <div className="lmn-pair lmn-grid-3">
                {rest.map((n) => <NewsCard key={n.href} n={n} />)}
              </div>
            )}
            <Pager page={page} pages={pages} hrefFor={(p) => `/league/${encodeURIComponent(ctx.slug)}/news?s=${ctx.sid}&p=${p}`} />
          </div>
        )}
      </main>
    </LeagueShell>
  );
}
