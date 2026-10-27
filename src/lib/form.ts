// FormData-аас утга авах туслахууд (server action-д)

export const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

export const int = (fd: FormData, k: string, def = 0) => {
  const v = parseInt(String(fd.get(k) ?? ''), 10);
  return Number.isFinite(v) ? v : def;
};

/** Хоосон бол null, үгүй бол бүхэл тоо */
export const intOrNull = (fd: FormData, k: string): number | null => {
  const raw = String(fd.get(k) ?? '').trim();
  if (raw === '') return null;
  const v = parseInt(raw, 10);
  return Number.isFinite(v) ? v : null;
};

export const strOrNull = (fd: FormData, k: string): string | null => str(fd, k) || null;

export const oneOf = <T extends string>(v: string, allowed: readonly T[], def: T): T =>
  (allowed as readonly string[]).includes(v) ? (v as T) : def;

export const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
