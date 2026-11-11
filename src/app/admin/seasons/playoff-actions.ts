'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { flashRedirect } from '@/lib/flash';
import { int } from '@/lib/form';
import { canSeason } from '@/lib/scope';
import { BEST_OF, PLAYOFF_SIZES, roundCount } from '@/lib/playoff-shared';

const MISSING_TABLE = 'Плейоффын хүснэгт үүсээгүй байна. database/2026-11-11-playoffs.sql-ийг Supabase дээр ажиллуулна уу.';

/** Плейофф үүсгэх / засах — багийн тоо, шат бүрийн best-of, №1..N байрлал */
export async function savePlayoff(fd: FormData) {
  const user = await requireRole(['admin', 'commissioner']);
  const seasonId = int(fd, 'season_id');
  const back = `/admin/seasons/${seasonId}?tab=playoff`;
  if (!(await canSeason(user, seasonId))) return flashRedirect('danger', 'Эрхгүй.', back);

  const n = int(fd, 'team_count');
  if (!(PLAYOFF_SIZES as readonly number[]).includes(n)) return flashRedirect('danger', 'Багийн тоо буруу байна.', back);

  const bestOf = Array.from({ length: roundCount(n) }, (_, r) => int(fd, `bo_${r}`, 1));
  if (bestOf.some((b) => !(BEST_OF as readonly number[]).includes(b))) return flashRedirect('danger', 'Best-of утга буруу байна.', back);

  const valid = new Set((await query<{ id: number }>('SELECT id FROM season_teams WHERE season_id=?', [seasonId])).map((r) => r.id));
  const seeds: [number, number][] = [];
  const used = new Set<number>();
  for (let s = 1; s <= n; s++) {
    const stid = int(fd, `seed_${s}`);
    if (!stid) continue;
    if (!valid.has(stid)) return flashRedirect('danger', `№${s}: сонгосон баг энэ улиралд бүртгэлгүй байна.`, back);
    if (used.has(stid)) return flashRedirect('danger', `№${s}: нэг багийг хоёр байранд оруулж болохгүй.`, back);
    used.add(stid);
    seeds.push([s, stid]);
  }
  if (seeds.length < 2) return flashRedirect('danger', 'Дор хаяж 2 баг байрлуулна уу.', back);

  try {
    await transaction(async (tx) => {
      const row = await tx.queryOne<{ id: number }>(
        `INSERT INTO playoffs (season_id, team_count, best_of) VALUES (?,?,?)
         ON CONFLICT (season_id) DO UPDATE SET team_count=EXCLUDED.team_count, best_of=EXCLUDED.best_of
         RETURNING id`,
        [seasonId, n, bestOf.join(',')],
      );
      const pid = row!.id;
      await tx.execute('DELETE FROM playoff_seeds WHERE playoff_id=?', [pid]);
      for (const [seed, stid] of seeds) {
        await tx.execute('INSERT INTO playoff_seeds (playoff_id, seed, season_team_id) VALUES (?,?,?)', [pid, seed, stid]);
      }
    });
  } catch (e) {
    if ((e as { code?: string }).code === '42P01') return flashRedirect('danger', MISSING_TABLE, back);
    throw e;
  }
  revalidatePath('/', 'layout');
  return flashRedirect('success', 'Плейофф хадгалагдлаа.', back);
}

/** Плейоффын тохиргоог устгана — тоглолтууд хэвээр үлдэнэ */
export async function deletePlayoff(fd: FormData) {
  const user = await requireRole(['admin', 'commissioner']);
  const seasonId = int(fd, 'season_id');
  const back = `/admin/seasons/${seasonId}?tab=playoff`;
  if (!(await canSeason(user, seasonId))) return flashRedirect('danger', 'Эрхгүй.', back);
  await transaction(async (tx) => {
    await tx.execute('DELETE FROM playoff_seeds WHERE playoff_id IN (SELECT id FROM playoffs WHERE season_id=?)', [seasonId]);
    await tx.execute('DELETE FROM playoffs WHERE season_id=?', [seasonId]);
  });
  revalidatePath('/', 'layout');
  return flashRedirect('success', 'Плейоффын тохиргоо устгагдлаа.', back);
}
