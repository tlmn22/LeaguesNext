import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Oswald, Manrope, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const oswald = Oswald({ subsets: ['latin', 'cyrillic'], weight: ['400', '500', '600', '700'], variable: '--font-oswald', display: 'swap' });
const manrope = Manrope({ subsets: ['latin', 'cyrillic'], weight: ['300', '400', '500', '600', '700', '800'], variable: '--font-manrope', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin', 'cyrillic'], weight: ['400', '500', '600'], variable: '--font-jetbrains', display: 'swap' });

const GA_ID = 'G-41KP2QTQ01';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'https://leagues.mn'),
  title: { default: 'LeagueMN', template: '%s | LeagueMN' },
  description: 'Монголын сагсан бөмбөгийн лигүүдийн тоглолт, хүснэгт, тоглогчийн статистик нэг дороос.',
  manifest: '/manifest.json',
  icons: { icon: '/icons/icon.svg', apple: '/icons/icon.svg' },
  appleWebApp: { capable: true, title: 'LeagueMN', statusBarStyle: 'black-translucent' },
  other: { 'mobile-web-app-capable': 'yes' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f4f0' },
    { media: '(prefers-color-scheme: dark)', color: '#141210' },
  ],
};

// Хуудас ачаалагдахаас өмнө хадгалсан өнгөний горимыг тавина (анивчихаас сэргийлнэ)
const themeScript = `try{if(localStorage.getItem('lm-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className={`${oswald.variable} ${manrope.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preload" href="/fonts/material-icons-round.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="font-sans transition-colors duration-150">
        {children}
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="ga" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
        </Script>
        <Script id="sw" strategy="afterInteractive">
          {`if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(function(){});}`}
        </Script>
      </body>
    </html>
  );
}
