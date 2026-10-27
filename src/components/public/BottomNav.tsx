'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PUBLIC_NAV, isActive } from './Navbar';

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="lmn-tabbar" aria-label="Доод цэс">
      {PUBLIC_NAV.filter((n) => n.href !== '/about').map((n) => (
        <Link key={n.href} href={n.href} aria-current={isActive(pathname, n.href) ? 'page' : undefined}>
          <span className="mi" aria-hidden="true">{n.icon}</span>
          {n.short}
        </Link>
      ))}
    </nav>
  );
}
