// Мэдээний төрлүүд — шинэ төрөл нэмэхдээ энд нэмнэ (DB-д текстээр хадгалагдана)
export const NEWS_CATEGORIES = [
  ['general', 'Ерөнхий', 'newspaper'],
  ['recap', 'Тоглолтын тойм', 'sports_basketball'],
  ['announcement', 'Мэдэгдэл', 'campaign'],
  ['interview', 'Ярилцлага', 'mic'],
  ['transfer', 'Шилжилт хөдөлгөөн', 'swap_horiz'],
  ['feature', 'Нийтлэл', 'article'],
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number][0];
export const CATEGORY_KEYS = NEWS_CATEGORIES.map((c) => c[0]) as NewsCategory[];
export const categoryLabel = (k: string | null | undefined) => NEWS_CATEGORIES.find((c) => c[0] === k)?.[1] ?? null;
export const isCategory = (k: string | null | undefined): k is NewsCategory => CATEGORY_KEYS.includes(k as NewsCategory);
