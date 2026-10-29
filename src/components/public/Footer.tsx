import Link from 'next/link';
import { FacebookIcon, FACEBOOK_URL } from '../ui';
import { Logo } from './lmn';

const COLS: [string, [string, string][]][] = [
  ['Платформ', [['Мэдээ', '/news'], ['Тоглолтууд', '/schedule'], ['Лигүүд', '/leagues']]],
  ['Бусад', [['Нэвтрэх', '/admin']]],
];

export default function Footer() {
  return (
    <footer className="lmn-footer">
      <div className="lmn-footer-in">
        <div>
          <Logo />
          <p>Монголын сагсан бөмбөгийн лигүүдийн тоглолт, хүснэгт, статистик, мэдээ нэг дороос.</p>
          <a className="lmn-fb" href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">
            <FacebookIcon className="w-[18px] h-[18px]" /> Facebook
          </a>
        </div>
        {COLS.map(([title, links]) => (
          <div key={title}>
            <h4>{title}</h4>
            <ul>
              {links.map(([label, href]) => (
                <li key={href}><Link href={href}>{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="lmn-copy">© {new Date().getFullYear()} LeagueMN. Бүх эрх хуулиар хамгаалагдсан.</div>
    </footer>
  );
}
