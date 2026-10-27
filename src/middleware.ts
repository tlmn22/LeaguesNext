import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/session-token';

const LEAGUE_PAGES = ['standings', 'matches', 'teams', 'players', 'stats'];

/** Хуучин PHP URL → шинэ URL (хуваалцсан линк, Google index эвдрэхгүй) */
function legacyRedirect(req: NextRequest): URL | null {
  const { pathname, searchParams } = req.nextUrl;
  const to = (path: string, keep: Record<string, string | null> = {}) => {
    const u = new URL(path, req.url);
    for (const [k, v] of Object.entries(keep)) if (v) u.searchParams.set(k, v);
    return u;
  };
  const p = pathname.replace(/\/+$/, '') || '/';

  switch (p) {
    case '/index.php':
    case '/public':
    case '/public/index.php':
      return to('/');
    case '/public/leagues.php':
      return to('/leagues', { status: searchParams.get('status') });
    case '/public/schedule.php':
      return to('/schedule', { d: searchParams.get('d') });
    case '/public/about.php':
      return to('/about');
    case '/public/contact.php':
      return to('/contact');
    case '/public/match.php':
    case '/public/league/match.php': {
      const id = parseInt(searchParams.get('id') ?? '', 10);
      return to(id ? `/match/${id}` : '/');
    }
    case '/public/player.php': {
      const id = parseInt(searchParams.get('id') ?? '', 10);
      return to(id ? `/player/${id}` : '/', { s: searchParams.get('s') });
    }
    case '/public/league/index.php':
    case '/league/index.php': {
      const lg = searchParams.get('lg');
      if (!lg) return to('/');
      const page = searchParams.get('page') ?? 'home';
      const team = parseInt(searchParams.get('team') ?? '', 10);
      let path = `/league/${encodeURIComponent(lg)}`;
      if (LEAGUE_PAGES.includes(page)) {
        path += `/${page}`;
        if (page === 'teams' && team) path += `/${team}`;
      }
      return to(path, {
        s: searchParams.get('s'),
        f: searchParams.get('f'),
        st: searchParams.get('st'),
        team: page === 'players' ? searchParams.get('team') : null,
      });
    }
    case '/login.php':
      return to('/login');
    case '/logout.php':
      return to('/logout');
    case '/admin/index.php':
      return to('/admin');
  }
  return null;
}

export async function middleware(req: NextRequest) {
  const legacy = legacyRedirect(req);
  if (legacy) return NextResponse.redirect(legacy, 301);

  const { pathname } = req.nextUrl;
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      const url = new URL('/login', req.url);
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/public', '/public/:path*', '/league/index.php', '/index.php', '/login.php', '/logout.php'],
};
