// Плейоффын цэвэр туслахууд — server болон client хоёуланд ашиглана

export const PLAYOFF_SIZES = [2, 4, 8, 16] as const;
export const BEST_OF = [1, 3, 5, 7] as const;

/** Багийн тооноос шатны тоо: 2→1, 4→2, 8→3, 16→4 */
export const roundCount = (n: number) => Math.round(Math.log2(n));

/** Тухайн шатанд үлдсэн багийн тоогоор нэрлэнэ */
export function roundName(teamsLeft: number): string {
  if (teamsLeft <= 2) return 'Финал';
  if (teamsLeft === 4) return 'Хагас финал';
  if (teamsLeft === 8) return '1/4 финал';
  return `1/${teamsLeft / 2} финал`;
}

/** Шат бүрийн нэр, эхний шатнаас финал хүртэл */
export const roundNames = (n: number) => Array.from({ length: roundCount(n) }, (_, r) => roundName(n >> r));

/**
 * Сүлжээн дэх seed-ийн дараалал — дээд seed-үүд финал хүртэл таарахгүй.
 * 8 → [1,8, 4,5, 2,7, 3,6] (хос хосоороо эхний шатны тулаан)
 */
export function bracketOrder(n: number): number[] {
  let order = [1];
  while (order.length < n) {
    const size = order.length * 2;
    order = order.flatMap((s) => [s, size + 1 - s]);
  }
  return order;
}

/** "3,3,5" → [3,3,5]; дутуу/буруу утгыг 1-ээр нөхнө */
export function parseBestOf(raw: string | null | undefined, rounds: number): number[] {
  const parts = String(raw ?? '').split(',').map((x) => parseInt(x, 10));
  return Array.from({ length: rounds }, (_, i) => ((BEST_OF as readonly number[]).includes(parts[i]) ? parts[i] : 1));
}

/** Best-of N цувралд ялахад шаардлагатай хожил */
export const winsNeeded = (bestOf: number) => Math.floor(bestOf / 2) + 1;
