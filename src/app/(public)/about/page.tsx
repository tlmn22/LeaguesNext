import Link from 'next/link';
import type { Metadata } from 'next';
import { scalar } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Бидний тухай' };

const FEATURES = [
  ['sports_basketball', 'Бодит цагийн дүн', 'Тоглолт болох явцад шууд шинэчлэгдэнэ'],
  ['bar_chart', 'Дэлгэрэнгүй стат', 'Тоглогч бүрийн бүрэн статистик'],
  ['videocam', 'Шууд дамжуулалт', 'YouTube болон бусад stream суулгах боломж'],
  ['group', 'Олон лиг', 'Нэг платформд олон лигийн мэдээлэл'],
];

const STEPS = [
  ['1', 'shield', 'Лиг бүртгүүлнэ', 'Тэмцээний зохион байгуулагч лигийн мэдээллээ оруулж, улирал нээнэ.'],
  ['2', 'edit_note', 'Стат оруулна', 'Статистикч тоглолт бүрийн дүн, тоглогчийн статистикийг бүртгэнэ.'],
  ['3', 'public', 'Олон нийтэд', 'Бүх мэдээлэл LeagueMN-д нэн даруй нийтлэгдэнэ.'],
];

export default async function AboutPage() {
  const [leagues, seasons, matches, players] = await Promise.all([
    scalar('SELECT COUNT(*) FROM leagues'),
    scalar('SELECT COUNT(*) FROM seasons'),
    scalar("SELECT COUNT(*) FROM matches WHERE status='finished'"),
    scalar('SELECT COUNT(*) FROM players'),
  ]);

  return (
    <>
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 pb-14 text-center">
        <h1 className="font-display text-5xl sm:text-6xl tracking-wide leading-none mb-5 uppercase">
          League<span className="text-primary">MN</span>
        </h1>
        <p className="text-ink2 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
          Манай системд бүртгэгдсэн бүх лигийн мэдээллийг нэг дороос авах боломжтой.
        </p>
      </section>

      <div className="border-y border-line">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-line">
            {([[leagues, 'Лиг'], [seasons, 'Улирал'], [matches, 'Тоглолт'], [players, 'Тоглогч']] as const).map(([n, l]) => (
              <div key={l} className="py-7 text-center">
                <div className="font-display text-4xl text-primary">{n ?? 0}</div>
                <div className="text-[11px] uppercase tracking-widest text-muted mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Бидний зорилго</div>
            <h2 className="font-display text-4xl sm:text-5xl leading-tight mb-6">
              САГСАНБӨМБӨГИЙН ЛИГҮҮДИЙГ
              <br />
              <span style={{ color: '#E8601C' }}>ХҮРТЭЭМЖТЭЙ</span>
              <br />
              БОЛГОНО
            </h2>
            <p className="text-ink2 leading-relaxed mb-4">
              LeagueMN нь Монголын сагсанбөмбөгийн лигүүдийг цахим орчинд нэгтгэж, тоглогч, тэмцээний зохион байгуулагч болон
              фанатуудад зориулан мэдээлэл нээлттэй болгох зорилгоор байгуулагдсан.
            </p>
            <p className="text-ink2 leading-relaxed">Бодит цагийн оноо, тоглогч бүрийн дэлгэрэнгүй статистик, тоглолтын хуваарь — бүгдийг нэг дор, үнэгүй.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {FEATURES.map(([icon, title, desc]) => (
              <div key={title} className="border border-line rounded-lg p-5 hover:border-primary transition-colors">
                <span className="material-icons-round text-2xl mb-3 block text-primary">{icon}</span>
                <div className="font-medium text-sm mb-1">{title}</div>
                <div className="text-xs text-muted leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <div className="text-[11px] font-medium uppercase tracking-widest text-primary-ink mb-2">Хэрхэн ажилладаг</div>
            <h2 className="font-display text-3xl uppercase">Платформын бүтэц</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {STEPS.map(([n, icon, title, desc]) => (
              <div key={n} className="border border-line rounded-lg p-7 text-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 font-display text-lg text-white bg-primary">{n}</div>
                <span className="material-icons-round text-2xl mb-3 block text-line2">{icon}</span>
                <div className="font-medium text-base mb-2">{title}</div>
                <div className="text-sm text-muted leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h2 className="font-display text-3xl sm:text-4xl mb-4 uppercase">Лигээ нэмэх үү?</h2>
        <p className="text-ink2 mb-7 max-w-lg mx-auto">Таны тэмцээнийг LeagueMN-д нэмж, фанатуудтайгаа холбогдоорой.</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-white bg-primary hover:opacity-90 transition-opacity">
            <span className="material-icons-round text-lg">mail</span> Холбоо барих
          </Link>
          <Link href="/leagues" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium border border-line2 text-ink2 hover:border-primary hover:text-primary transition-colors">
            <span className="material-icons-round text-lg">sports_basketball</span> Лигүүд үзэх
          </Link>
        </div>
      </section>
    </>
  );
}
