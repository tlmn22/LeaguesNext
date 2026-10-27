import Link from 'next/link';

/** Хуудаслалт — `hrefFor(page)` URL буцаана */
export default function Pager({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (p: number) => string }) {
  if (pages <= 1) return null;
  const nums = new Set<number>([1, pages, page - 1, page, page + 1, page - 2, page + 2]);
  const list = [...nums].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const cls = 'min-w-8 h-8 px-2 grid place-items-center rounded-md text-sm border';
  return (
    <nav className="flex items-center gap-1.5 mt-5 flex-wrap">
      {list.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && n - list[i - 1] > 1 && <span className="text-muted">…</span>}
          <Link href={hrefFor(n)} className={`${cls} ${n === page ? 'border-primary bg-primary/15 text-primary-ink' : 'border-line2 text-ink2 hover:border-primary'}`}>
            {n}
          </Link>
        </span>
      ))}
    </nav>
  );
}
