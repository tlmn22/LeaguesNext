import type { Metadata } from 'next';
import { countNews, latestNews, toCard } from '@/lib/news';
import { EmptyState, NewsCard, NewsFeatured, SectionHeader } from '@/components/public/lmn';
import Pager from '@/components/admin/Pager';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Мэдээ' };

const PER_PAGE = 13;

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const total = await countNews();
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(pages, Math.max(1, parseInt((await searchParams).p ?? '', 10) || 1));
  const items = (await latestNews(PER_PAGE, (page - 1) * PER_PAGE)).map(toCard);
  // Эхний хуудсанд эхний мэдээ онцлох
  const feature = page === 1 ? items[0] : undefined;
  const rest = feature ? items.slice(1) : items;

  return (
    <main className="lmn-main">
      <SectionHeader title="Мэдээ" as="h1" />
      {items.length === 0 ? (
        <div className="lmn-card">
          <EmptyState icon="newspaper" title="Мэдээ байхгүй байна" text="Шинэ мэдээ нийтлэгдэхэд энд харагдана." />
        </div>
      ) : (
        <div className="lmn-stack">
          {feature && <NewsFeatured n={feature} />}
          {rest.length > 0 && (
            <div className="lmn-pair lmn-grid-3">
              {rest.map((n) => <NewsCard key={n.href} n={n} />)}
            </div>
          )}
          <Pager page={page} pages={pages} hrefFor={(p) => `/news?p=${p}`} />
        </div>
      )}
    </main>
  );
}
