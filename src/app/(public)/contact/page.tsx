import type { Metadata } from 'next';
import { FACEBOOK_URL, FacebookIcon } from '@/components/ui';
import ContactForm from './ContactForm';

export const metadata: Metadata = { title: 'Холбоо барих' };

export default function ContactPage() {
  return (
    <>
      <section className="py-14 border-b border-line">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="material-icons-round text-2xl text-primary block mb-4">mail</span>
          <h1 className="font-display text-4xl sm:text-5xl tracking-wide mb-3 uppercase">Холбоо барих</h1>
          <p className="text-muted text-sm max-w-xl mx-auto">Асуулт, санал, хамтран ажиллах хүсэлтээ бидэнд илгээгээрэй.</p>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="space-y-5">
            <h2 className="font-medium text-[13px] uppercase tracking-[0.14em] text-muted mb-1">Шууд холбоо</h2>
            <div className="flex items-start gap-3.5 py-3 border-t border-line">
              <span className="material-icons-round text-lg text-primary shrink-0 mt-0.5">language</span>
              <div className="min-w-0">
                <div className="text-[10px] font-medium uppercase tracking-widest text-muted mb-0.5">Вэбсайт</div>
                <a href="https://leagues.mn" className="font-medium text-sm hover:text-primary transition-colors break-all">leagues.mn</a>
              </div>
            </div>
            <div className="flex items-start gap-3.5 py-3 border-t border-line">
              <span className="text-primary shrink-0 mt-1 w-[18px] grid place-items-center">
                <FacebookIcon className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-medium uppercase tracking-widest text-muted mb-0.5">Facebook</div>
                <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:text-primary transition-colors break-all">LeagueMN</a>
              </div>
            </div>
            <div className="flex items-start gap-3.5 py-3 border-t border-line">
              <span className="material-icons-round text-lg text-primary shrink-0 mt-0.5">location_on</span>
              <div className="min-w-0">
                <div className="text-[10px] font-medium uppercase tracking-widest text-muted mb-0.5">Байршил</div>
                <div className="font-medium text-sm">Улаанбаатар, Монгол</div>
              </div>
            </div>

            <div className="rounded-lg p-5 text-white bg-primary mt-6">
              <span className="material-icons-round text-2xl mb-3 block opacity-80">emoji_events</span>
              <div className="font-display text-lg mb-2 uppercase">Лигээ нэмэх</div>
              <p className="text-sm opacity-80 leading-relaxed">Таны тэмцээнийг манай платформд нэмж, тоглогч, фанатуудтайгаа холбогд.</p>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="border border-line rounded-lg p-7">
              <ContactForm />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
