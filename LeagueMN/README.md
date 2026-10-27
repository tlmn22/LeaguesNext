# LeagueMN

Монголын сонирхогч болон хагас мэргэжлийн сагсан бөмбөгийн платформ: оноо, хуваарь, хүснэгт, тоглогчийн статистик, мэдээ. Хэв маяг — спорт медиагийн эрч хүчтэй, гэхдээ цэвэр, задгай: 16px радиустай карт, сүүдрийн оронд hairline хүрээ, өргөн зай, ганц улбар шар accent.

Хуудсууд: **HomePage** (desktop 1280), **HomeMobile** (390), **ArticlePage**, **EmptyStates** — Components хэсгийн "Pages" бүлэгт.

## Агуулгын зарчим

- Бүх UI текст монгол кирилл. Шошгууд тогтмол: "Сүүлд болсон тоглолтууд", "Бүх хуваарь →", "Мэдээ", "Дэлгэрэнгүй ›", "Бүх мэдээ →", "Явагдаж буй лигүүд", "Бүх лиг ›", "Удахгүй болох тоглолтууд", "Бүх хуваарь ›", "Бусад мэдээ".
- Холбоос: `→` бол жагсаалт руу ("Бүх мэдээ →"), `›` бол карт доторх дэлгэрэнгүй ("Дэлгэрэнгүй ›").
- Огноо: `2026.10.27`; товч хэлбэр `10.27`; цаг `19:00`. Мета мөр: `огноо · лиг`.
- Багийн товчлол 3 латин үсэг (HKH, BST), Oswald; бүтэн нэр `title` атрибутад.
- Гарчгийг эх бичвэрт жижиг үсгээр бичнэ; Oswald гарчгийг CSS `uppercase` болгоно.
- Урт кирилл гарчиг: карт дээр 2 мөр clamp + `overflow-wrap: anywhere`, бүтэн текст `title`-д; мэдээний хуудсанд бүтнээр, `text-wrap: balance`, max 24ch.

## Харааны суурь

- **Өнгө.** `accent` #E8601C (dark #F2743A) — лого MN ба цэг, номын икон, chevron, progress, hover хүрээ. Гэрэл горимд card дээр 3.3:1 тул **18px-ээс жижиг улбар шар текстэнд `accent-text` #B94810 (5.1:1)** ашигла; dark горимд хоёулаа #F2743A (5.7:1). Төлвийн өнгө: `live` улаан (шууд), `active` ногоон (явагдаж буй, анивчдаг цэг), `scheduled` цэнхэр (товлогдсон огноо). Ногоон жижиг текстэнд `active-text`.
- **Лигийн өнгө.** Лиг бүр өөрийн өнгөтэй (`league-*` эсвэл лигийн hex) — 48px tile дээр 14% tint, progress bar дүүрэн өнгөөр. CSS хувьсагч `--lc`-ээр дамжуулна.
- **Үсэг.** Oswald 500/600 — гарчиг, оноо, товчлол (том үсэг). Manrope 400–800 — бичвэр, мэдээний гарчиг (700/800). Хоёулаа кирилл дэмжинэ.
- **Икон.** Material Icons Round: calendar_today, menu_book, chevron_right, newspaper, emoji_events, sports_basketball, home, call, dark_mode/light_mode, menu, arrow_back.
- **Карт.** `card` + 1px `border` + `radius-xl`, сүүдэргүй. Hover: хүрээ `accent`, гарчиг `accent-text`; мөрүүдэд `card-hover` дэвсгэр + chevron 2px баруун тийш; cover зураг 1.03 томорно.
- **Зураггүй мэдээ.** `sunken` дэвсгэр + 16px цэгэн хэв + төвд `newspaper` икон; 16:9 харьцаа хадгална.
- **Layout.** Max 1280px, хажуу 32px. Үндсэн бие `minmax(0,1fr) 340px`, gap 32px, sidebar `sticky top-[88px]`. <1024px — нэг багана (мэдээ → sidebar). <900px — navbar menu товч, доод tab bar, хажуу 16px, доод padding 88px.
- **Хүртээмж.** Бүх текст хоёр горимд ≥4.5:1; icon-only товч `sr-only` нэртэй; progress `role=progressbar`; `prefers-reduced-motion` үед pulse зогсоно; focus — 2px `focus` цагираг.

## Next.js + Tailwind CSS 4

`app/globals.css`:

```css
@import "tailwindcss";
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));

:root {
  --bg: #F3F5FE; --card: #FBFBFF; --card-hover: #F5F6FF; --sunken: #ECEFF9;
  --text: #1B1C24; --text-secondary: #595D6C;
  --line: rgba(41,43,49,.10); --line-strong: rgba(41,43,49,.45);
  --accent: #E8601C; --accent-text: #B94810; --accent-soft: rgba(232,96,28,.10);
  --live: #D93A2B; --active: #1F8A4C; --active-text: #17793F; --scheduled: #2563A8;
}
[data-theme=dark] {
  --bg: #161826; --card: #1D1F2D; --card-hover: #23263A; --sunken: #252838;
  --text: #E9E9ED; --text-secondary: #A3A6B4;
  --line: rgba(233,233,237,.10); --line-strong: rgba(233,233,237,.40);
  --accent: #F2743A; --accent-text: #F2743A; --accent-soft: rgba(242,116,58,.14);
  --live: #F26B5E; --active: #3FB171; --active-text: #3FB171; --scheduled: #6AA5EA;
}
@theme inline {
  --color-bg: var(--bg); --color-card: var(--card); --color-card-hover: var(--card-hover); --color-sunken: var(--sunken);
  --color-fg: var(--text); --color-muted: var(--text-secondary);
  --color-line: var(--line); --color-line-strong: var(--line-strong);
  --color-accent: var(--accent); --color-accent-text: var(--accent-text); --color-accent-soft: var(--accent-soft);
  --color-live: var(--live); --color-active: var(--active); --color-scheduled: var(--scheduled);
  --font-display: var(--font-oswald), "Arial Narrow", sans-serif;
  --font-sans: var(--font-manrope), system-ui, sans-serif;
}
```

Фонт: `next/font/google` — `Oswald({ subsets: ["latin","cyrillic"], weight: ["500","600"], variable: "--font-oswald" })`, `Manrope({ subsets: ["latin","cyrillic"], variable: "--font-manrope" })`. Икон: `<link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round">` эсвэл `@mui/icons-material/*Rounded`.

Гол class жор:

| Элемент | Tailwind |
| --- | --- |
| Карт | `rounded-2xl border border-line bg-card transition-colors hover:border-accent` |
| Гарчгийн hover | `group` карт дээр, гарчигт `group-hover:text-accent-text` |
| Хэсгийн гарчиг | `font-display text-[22px] font-semibold uppercase tracking-wide` + `before:w-1 before:h-5 before:rounded before:bg-accent` |
| Үр дүнгийн strip | `flex gap-3 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none]`, карт `w-[212px] shrink-0 snap-start` |
| Үндсэн бие | `grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]`, aside `lg:sticky lg:top-22` |
| Cover | `relative aspect-video overflow-hidden rounded-xl bg-sunken` |
| Огнооны pill | `absolute bottom-3 left-3 rounded-full bg-black/70 px-2.5 h-7 text-xs font-semibold text-white` |
| 2 мөр clamp | `line-clamp-2 [overflow-wrap:anywhere]` |
| Мэдээний мөр | `grid grid-cols-[96px_minmax(0,1fr)_20px] gap-4 rounded-xl p-3 hover:bg-card-hover` |
| Progress | `h-1 rounded-full bg-sunken` > `h-full rounded-full bg-(--lc)` |
| Tab bar | `fixed inset-x-0 bottom-0 grid grid-cols-5 h-16 pb-[env(safe-area-inset-bottom)] border-t border-line bg-card/90 backdrop-blur min-[900px]:hidden` |

Яг ижил бүтэц, утгыг `components/bundle.css` ба `bundle.js`-ээс хуулж болно.
