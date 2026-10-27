/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LEAGUE_TABS, lgPath, seasonGender, seasonLabel, type LeagueCtx, type LeagueTab } from '@/lib/league';
import { fileUrl, initials, isLightColor } from '@/lib/format';
import Navbar from '../public/Navbar';
import Footer from '../public/Footer';
import BottomNav from '../public/BottomNav';
import { NavSelect } from '../public/NavSelect';

const GENDERS = [
  ['M', 'Эрэгтэй'],
  ['F', 'Эмэгтэй'],
] as const;

export default function LeagueShell({ ctx, active, children }: { ctx: LeagueCtx; active: LeagueTab; children: ReactNode }) {
  const { lg, seasons, sid, season, ac, slug } = ctx;
  const logo = lg.logo ? fileUrl(lg.logo) : null;
  const light = isLightColor(ac);

  // Лиг эрэгтэй, эмэгтэй хоёр улиралтай бол хүйсээр шүүнэ
  const gender = season ? seasonGender(season.name) : null;
  const genders = new Set(seasons.map((s) => seasonGender(s.name)));
  const byGender = gender && genders.has('M') && genders.has('F');
  const shown = byGender ? seasons.filter((s) => seasonGender(s.name) === gender) : seasons;
  const label = (name: string) => (byGender ? seasonLabel(name) || name : name);
  const page = active === 'home' ? '' : '/' + active;
  const seasonTpl = `/league/${encodeURIComponent(slug)}${page}?s={v}`;

  return (
    <div className="lmn-site min-h-screen bg-bg text-ink">
      <Navbar />

      <section
        className={`lg-hero ${light ? 'is-light' : ''}`}
        style={{ background: `linear-gradient(115deg, ${ac} 0%, color-mix(in srgb, ${ac} 78%, #fff) 100%)` }}
      >
        <div className="lg-hero-in">
          <span className="lg-hero-logo" style={{ color: ac }}>
            {logo ? <img src={logo} alt="" /> : initials(lg.name)}
          </span>
          <div className="min-w-0 flex-1">
            <nav className="lg-crumbs" aria-label="Breadcrumb">
              <Link href="/">Нүүр</Link>
              <span aria-hidden="true">/</span>
              <span className="truncate">{lg.name}</span>
            </nav>
            <h1 className="lg-title">{lg.name}</h1>
          </div>
          <div className="lg-hero-actions">
            {byGender && (
              <div className="lg-seg" role="group" aria-label="Хүйс">
                {GENDERS.map(([g, text]) => {
                  const target = seasons.find((s) => seasonGender(s.name) === g);
                  return target ? (
                    <Link
                      key={g}
                      href={`/league/${encodeURIComponent(slug)}${page}?s=${target.id}`}
                      aria-current={gender === g ? 'true' : undefined}
                      style={gender === g ? { color: light ? '#1b1c24' : ac } : undefined}
                    >
                      {text}
                    </Link>
                  ) : null;
                })}
              </div>
            )}
            {shown.length > 0 && (
              <label className="lg-season">
                <span>Улирал:</span>
                <NavSelect value={sid} hrefTemplate={seasonTpl} className="lg-season-select">
                  {shown.map((s) => (
                    <option key={s.id} value={s.id}>{label(s.name)}</option>
                  ))}
                </NavSelect>
                <span className="mi" aria-hidden="true">expand_more</span>
              </label>
            )}
          </div>
        </div>
      </section>

      <nav className="lg-tabs" aria-label="Лигийн цэс">
        <div className="lg-tabs-in">
          {LEAGUE_TABS.map((t) => (
            <Link
              key={t.key}
              href={lgPath(slug, sid, t.key)}
              aria-current={active === t.key ? 'page' : undefined}
              style={{ '--lc': ac } as React.CSSProperties}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </nav>

      {children}

      <Footer />
      <BottomNav />
    </div>
  );
}
