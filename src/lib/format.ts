// Client болон server аль алинд ашиглагдах туслах функцууд (PHP init.php/functions.php-ийн оронд)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_MN_SHORT = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];
export const DAY_MN = ['Ням', 'Дав', 'Мяг', 'Лха', 'Пүр', 'Баа', 'Бям'];

/**
 * "YYYY-MM-DD[ HH:MM:SS]" мөрийг UTC Date болгоно. DB-ийн цагийг timezone-гүйгээр
 * "ханын цаг" гэж үзэж, getUTC* функцээр уншина — сервер аль бүсэд байх нь хамаагүй.
 */
export function parseDt(dt: string | null | undefined): Date | null {
  if (!dt) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(String(dt));
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0)));
}

const pad = (n: number) => String(n).padStart(2, '0');

/** PHP date()-ийн хэрэглэгддэг дэд хэсэг: d m Y y H i s M D */
export function fmtDate(dt: string | null | undefined, f = 'd.m.Y'): string {
  const d = parseDt(dt);
  if (!d) return '—';
  let out = '';
  for (const ch of f) {
    switch (ch) {
      case 'd': out += pad(d.getUTCDate()); break;
      case 'm': out += pad(d.getUTCMonth() + 1); break;
      case 'Y': out += d.getUTCFullYear(); break;
      case 'y': out += String(d.getUTCFullYear()).slice(2); break;
      case 'H': out += pad(d.getUTCHours()); break;
      case 'i': out += pad(d.getUTCMinutes()); break;
      case 's': out += pad(d.getUTCSeconds()); break;
      case 'M': out += MONTHS[d.getUTCMonth()]; break;
      case 'D': out += DAYS[d.getUTCDay()]; break;
      default: out += ch;
    }
  }
  return out;
}

/** Улаанбаатарын одоогийн цаг "YYYY-MM-DD HH:MM:SS" */
export function nowUB(): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ulaanbaatar',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

export const todayUB = () => nowUB().slice(0, 10);

/** "YYYY-MM-DD" + n өдөр */
export function addDays(date: string, n: number): string {
  const d = parseDt(date)!;
  d.setUTCDate(d.getUTCDate() + n);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export const dayIndex = (date: string) => parseDt(date)!.getUTCDay();

/** Хоёр "ханын цаг"-ийн зөрүү секундээр (a - b) */
export function diffSeconds(a: string, b: string): number {
  return Math.round((parseDt(a)!.getTime() - parseDt(b)!.getTime()) / 1000);
}

/** Баг/хүний нэрийг "Үг Бүрийн Эхний Үсэг Томоор" (PHP mb_convert_case MB_CASE_TITLE) */
export function tc(s: string | null | undefined): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/(^|[^\p{L}\p{N}'’])(\p{L})/gu, (_, pre: string, ch: string) => pre + ch.toUpperCase());
}

/** mb_substr(s, 0, n) — unicode тэмдэгтээр */
export function initials(s: string | null | undefined, n = 2): string {
  return Array.from(String(s ?? '')).slice(0, n).join('');
}

export function upper3(s: string | null | undefined): string {
  return initials(s, 3).toUpperCase();
}

export const fmtMin = (m: number | null, s: number | null) => `${m ?? 0}:${pad(s ?? 0)}`;

export const pct = (made: number, att: number, digits = 0) =>
  att > 0 ? Number(((made / att) * 100).toFixed(digits)) : 0;

/** PHP round(x, 1) шиг — 12.0 → 12 */
export const round1 = (x: number) => Math.round(x * 10) / 10;

export const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/**
 * Live stream талбарт бүтэн <iframe> embed код эсвэл жирийн YouTube холбоос орж ирж болно.
 * Аюулгүй байдлын үүднээс HTML-ийг шууд гаргахгүй, зөвхөн https src-ийг ялгаж авна.
 */
export function resolveStreamSrc(raw: string | null | undefined): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const yt = /(?:youtube\.com\/(?:watch\?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i.exec(s);
  if (/<iframe/i.test(s)) {
    const src = /src\s*=\s*["']([^"']+)["']/i.exec(s)?.[1] ?? '';
    if (/^https:\/\//i.test(src)) return src.replace(/&amp;/g, '&');
    return yt ? `https://www.youtube.com/embed/${yt[1]}` : '';
  }
  return yt ? `https://www.youtube.com/embed/${yt[1]}` : '';
}

/** Тоглолт эхлэхэд хэдэн хугацаа үлдсэн */
export function countdown(matchDt: string, now: string): string | null {
  const diff = diffSeconds(matchDt, now);
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  if (days > 0) return `${days} өдөр${hours > 0 ? ` ${hours} цаг` : ''} үлдлээ`;
  if (hours > 0) return `${hours} цаг${mins > 0 ? ` ${mins} мин` : ''} үлдлээ`;
  return `${mins} мин үлдлээ`;
}

/** DB-д "uploads/..." гэж хадгалагдсан замыг URL болгоно */
export const fileUrl = (p: string | null | undefined) => (p ? '/' + String(p).replace(/^\/+/, '') : '');

export const DEFAULT_ACCENT = '#E8601C';
export const accentOf = (c: string | null | undefined) => (c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : DEFAULT_ACCENT);

/** Цайвар өнгө эсэх (дээр нь хар текст тавих эсэхийг шийднэ) — WCAG relative luminance */
export function isLightColor(hex: string): boolean {
  const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2] > 0.4;
}

export const STAGES: Record<string, string> = {
  regular: 'Үндсэн',
  playoff: 'Плейофф',
  allstar: 'Одны тоглолт',
  custom: 'Тусгай',
};

export const isoDateOk = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && parseDt(v) !== null;
