/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { Metadata } from 'next';
import { countNews, latestNews, newsCategoryCounts, newsLeagues, toCard } from '@/lib/news';
import { NEWS_CATEGORIES, categoryLabel, isCategory } from '@/lib/news-categories';
import { fileUrl, initials } from '@/lib/format';
import { EmptyState, Icon, NewsCard, NewsFeatured, Panel, SectionHeader } from '@/components/public/lmn';
import Pager from '@/components/admin/Pager';

export const dynamic = 'force-dynamic';

type SP = { p?: string; c?: string; l?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const c = (await searchParams).c;
  return { title: isCategory(c) ? `${categoryLabel(c)} — Мэдээ` : 'Мэдээ' };
}

const PER_PAGE = 13;

/** Шүүлтүүрийн холбоос — нөгөө шүүлтүүрийг хадгалж, хуудаслалтыг эхнээс нь эхлүүлнэ */
function href(c: string, l: number, p = 1) {
  const q = new URLSearchParams();
  if (c) q.set('c', c);
  if (l) q.set('l', String(l));
  if (p > 1) q.set('p', String(p));
  const s = q.toString();
  return s ? `/news?${s}` : '/news';
}

function FilterRow({ to, active, icon, logo, label, n }: { to: string; active: boolean; icon?: string; logo?: string | null; label: string; n: number }) {
  return (
    <Link href={to} className={`lmn-frow ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined}>
      <span className="lmn-frow-ic">{logo ? <img src={logo} alt="" /> : icon ? <Icon n={icon} /> : initials(label)}</span>
      <span className="lmn-frow-l">{label}</span>
      <span className="lmn-frow-n">{n}</span>
    </Link>
  );
}

export default async function NewsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const cat = isCategory(sp.c) ? sp.c : '';
  const lg = parseInt(sp.l ?? '', 10) || 0;

  const [total, catCounts, leagues, allLeagues] = await Promise.all([countNews(lg, cat), newsCategoryCounts(lg), newsLeagues(cat), countNews(0, cat)]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(pages, Math.max(1, parseInt(sp.p ?? '', 10) || 1));
  const items = (await latestNews(PER_PAGE, (page - 1) * PER_PAGE, 0, lg, cat)).map(toCard);
  // Шүүлтгүй эхний хуудсанд эхний мэдээг онцолно
  const feature = page === 1 && !cat && !lg ? items[0] : undefined;
  const rest = feature ? items.slice(1) : items;

  const allCount = Object.values(catCounts).reduce((a, b) => a + b, 0);
  const leagueName = leagues.find((x) => x.id === lg)?.name;
  const subtitle = [leagueName, cat ? categoryLabel(cat) : null].filter(Boolean).join(' · ');
  // Мэдээгүй төрлийг нуух (сонгосон бол үлдээнэ)
  const cats = NEWS_CATEGORIES.filter(([k]) => catCounts[k] || k === cat);

  return (
    <main className="lmn-main">
      <SectionHeader title="Мэдээ" as="h1" />
      {subtitle && (
        <p className="lmn-news-sub">
          {subtitle} · {total} мэдээ <Link href="/news" className="lmn-link">Шүүлт арилгах ×</Link>
        </p>
      )}

      {/* Утсан дээр: ангиллууд хэвтээ гүйдэг chip-ээр */}
      <nav className="lmn-chips" aria-label="Мэдээний төрөл">
        <Link href={href('', lg)} className={!cat ? 'is-active' : ''}>Бүгд</Link>
        {cats.map(([k, l]) => (
          <Link key={k} href={href(k, lg)} className={cat === k ? 'is-active' : ''}>{l}</Link>
        ))}
      </nav>

      <div className="lmn-body lmn-news-body">
        <div className="lmn-stack">
          {items.length === 0 ? (
            <div className="lmn-card">
              <EmptyState icon="newspaper" title="Мэдээ байхгүй байна" text={subtitle ? 'Энэ шүүлтэд тохирох мэдээ алга.' : 'Шинэ мэдээ нийтлэгдэхэд энд харагдана.'} />
            </div>
          ) : (
            <>
              {feature && <NewsFeatured n={feature} />}
              {rest.length > 0 && (
                <div className="lmn-pair">
                  {rest.map((n) => <NewsCard key={n.href} n={n} />)}
                </div>
              )}
              <Pager page={page} pages={pages} hrefFor={(p) => href(cat, lg, p)} />
            </>
          )}
        </div>

        <aside className="lmn-aside lmn-news-aside">
          <Panel title="Ангилал">
            <FilterRow to={href('', lg)} active={!cat} icon="apps" label="Бүх мэдээ" n={allCount} />
            {cats.map(([k, l, ic]) => (
              <FilterRow key={k} to={href(k, lg)} active={cat === k} icon={ic} label={l} n={catCounts[k] ?? 0} />
            ))}
          </Panel>
          {leagues.length > 0 && (
            <Panel title="Лигээр">
              <FilterRow to={href(cat, 0)} active={!lg} icon="public" label="Бүх лиг" n={allLeagues} />
              {leagues.map((x) => (
                <FilterRow key={x.id} to={href(cat, x.id)} active={lg === x.id} logo={x.logo ? fileUrl(x.logo) : null} label={x.name} n={x.n} />
              ))}
            </Panel>
          )}
        </aside>
      </div>
    </main>
  );
}
