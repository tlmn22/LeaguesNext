'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import ThemeToggle from './ThemeToggle';
import { Logo } from './lmn';

export const PUBLIC_NAV = [
  { href: '/', label: 'Нүүр', short: 'Нүүр', icon: 'home' },
  { href: '/news', label: 'Мэдээ', short: 'Мэдээ', icon: 'newspaper' },
  { href: '/schedule', label: 'Тоглолтууд', short: 'Тоглолт', icon: 'sports_basketball' },
  { href: '/leagues', label: 'Лигүүд', short: 'Лигүүд', icon: 'emoji_events' },
];

export function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  if (href === '/leagues') return pathname.startsWith('/leagues') || pathname.startsWith('/league/');
  return pathname.startsWith(href);
}

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="lmn-nav">
      <div className="lmn-nav-in">
        <Logo />
        <nav className="lmn-nav-links" aria-label="Үндсэн цэс">
          {PUBLIC_NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={isActive(pathname, n.href) ? 'page' : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="lmn-nav-actions">
          <ThemeToggle />
          <button type="button" className="lmn-btn lmn-btn-icon lmn-nav-menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <span className="mi" aria-hidden="true">{open ? 'close' : 'menu'}</span>
            <span className="sr">{open ? 'Цэс хаах' : 'Цэс нээх'}</span>
          </button>
        </div>
      </div>

      {open && (
        <nav className="lmn-nav-drop" aria-label="Цэс">
          {PUBLIC_NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} aria-current={isActive(pathname, n.href) ? 'page' : undefined}>
              <span className="mi" aria-hidden="true">{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
