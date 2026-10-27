import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { requireUser, roleLabel, type User } from '@/lib/auth';
import { scalar } from '@/lib/db';
import { fmtDate, nowUB } from '@/lib/format';
import { Flash, NavLink, SidebarShell } from '@/components/admin/client';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s — LeagueMN Admin' },
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

type Item = { href: string; icon: string; label: string; count?: number | null };

async function cnt(sql: string, params: (string | number)[] = []) {
  try {
    return Number(await scalar(sql, params));
  } catch {
    return null;
  }
}

async function buildMenu(u: User): Promise<[string, Item[]][]> {
  if (u.role === 'admin') {
    const [lg, se, te, pl, ma, nw] = await Promise.all([
      cnt('SELECT COUNT(*) FROM leagues'),
      cnt('SELECT COUNT(*) FROM seasons'),
      cnt('SELECT COUNT(*) FROM teams'),
      cnt('SELECT COUNT(*) FROM players'),
      cnt('SELECT COUNT(*) FROM matches'),
      cnt('SELECT COUNT(*) FROM news'),
    ]);
    return [
      ['Ерөнхий', [{ href: '/admin', icon: 'insights', label: 'Dashboard' }]],
      [
        'Лиг & Тоглолт',
        [
          { href: '/admin/leagues', icon: 'emoji_events', label: 'Лигүүд', count: lg },
          { href: '/admin/seasons', icon: 'calendar_month', label: 'Улирал', count: se },
          { href: '/admin/teams', icon: 'groups', label: 'Багууд', count: te },
          { href: '/admin/players', icon: 'directions_run', label: 'Тоглогчид', count: pl },
          { href: '/admin/matches', icon: 'sports_basketball', label: 'Тоглолтууд', count: ma },
        ],
      ],
      ['Контент', [{ href: '/admin/news', icon: 'newspaper', label: 'Мэдээ', count: nw }]],
      ['Систем', [{ href: '/admin/users', icon: 'manage_accounts', label: 'Хэрэглэгчид' }]],
    ];
  }
  const lid = u.league_id ?? 0;
  const [se, ma] = await Promise.all([
    cnt('SELECT COUNT(*) FROM seasons WHERE league_id=?', [lid]),
    cnt('SELECT COUNT(*) FROM matches m JOIN seasons s ON s.id=m.season_id WHERE s.league_id=?', [lid]),
  ]);
  return [
    ['Ерөнхий', [{ href: '/admin', icon: 'insights', label: 'Dashboard' }]],
    [
      'Миний лиг',
      [
        { href: '/admin/seasons', icon: 'calendar_month', label: 'Улирал', count: se },
        { href: '/admin/teams', icon: 'groups', label: 'Багууд' },
        { href: '/admin/players', icon: 'directions_run', label: 'Тоглогчид' },
        { href: '/admin/matches', icon: 'sports_basketball', label: 'Тоглолтууд', count: ma },
        { href: '/admin/news', icon: 'newspaper', label: 'Мэдээ' },
      ],
    ],
  ];
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const menu = await buildMenu(user);

  const sidebar = (
    <>
      <div className="px-5 py-4 border-b border-line shrink-0">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl font-semibold">
            League<span className="text-primary">MN</span>
          </span>
        </Link>
        <span className="inline-block mt-2 text-[10px] font-medium uppercase tracking-widest text-primary-ink bg-primary/15 px-2 py-0.5 rounded">{roleLabel(user.role)}</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {menu.map(([group, items]) => (
          <div key={group} className="py-2 border-b border-line">
            <div className="px-5 pb-1.5 text-[10px] font-medium uppercase tracking-widest text-muted">{group}</div>
            {items.map((it) => (
              <NavLink key={it.href} href={it.href} icon={it.icon} label={it.label} count={it.count} />
            ))}
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-line shrink-0">
        <div className="text-[13px] font-medium truncate">{user.name}</div>
        <div className="text-[11px] text-muted truncate">{user.email}</div>
        <form action="/logout" method="post">
          <button type="submit" className="inline-flex items-center gap-1.5 mt-2 text-[12px] text-muted hover:text-live transition-colors">
            <span className="material-icons-round text-sm">logout</span> Гарах
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="admin-theme bg-bg text-ink min-h-screen font-sans">
      <SidebarShell sidebar={sidebar}>
        <header className="sticky top-0 z-20 bg-surface border-b border-line px-4 md:px-7 py-3 flex items-center justify-between gap-3 min-h-[58px]">
          <div className="pl-11 md:pl-0 text-xs text-muted truncate">
            {user.role === 'commissioner' && !user.league_id && <span className="text-amber-400">Танд лиг оноогоогүй байна — админд хандана уу.</span>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted">
              <span className="material-icons-round text-sm">schedule</span>
              {fmtDate(nowUB(), 'Y.m.d H:i')}
            </span>
          </div>
        </header>
        <main className="p-4 md:p-7 flex-1">
          <Suspense>
            <Flash />
          </Suspense>
          {children}
        </main>
      </SidebarShell>
    </div>
  );
}
