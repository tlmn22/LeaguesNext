'use server';

import ExcelJS from 'exceljs';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { query, queryOne, transaction } from '@/lib/db';
import { canSeasonTeam } from '@/lib/scope';
import { setFlash } from '@/lib/flash';

export type ImportRow = { last: string; first: string; jersey: string | null; pos: string | null; height: number | null; weight: number | null; note: string; status: 'new' | 'add' | 'exists' | 'conflict'; conflictTeam?: string };
export type PreviewResult = { ok: true; rows: ImportRow[] } | { ok: false; error: string };

const SKIP = ['овог', 'овог *', 'last', 'lastname', 'last name', 'багийн нэр', 'нэр *', 'нэр'];
const VALID_POS = ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F'];

// Баганыг толгой мөрийн нэрээр танина — өндөр/жингүй хуучин template ч зөв уншигдана
type ColMap = Record<'last' | 'first' | 'jersey' | 'pos' | 'height' | 'weight' | 'note', number>;
const DEFAULT_COLS: ColMap = { last: 1, first: 2, jersey: 3, pos: 4, height: 5, weight: 6, note: 7 };

function detectCols(raw: string[][]): ColMap {
  for (const r of raw.slice(0, 5)) {
    const h = r.map((c) => c.toLowerCase().trim());
    const at = (...names: string[]) => h.findIndex((c) => names.some((n) => c.startsWith(n)));
    const last = at('овог', 'last');
    if (last < 0) continue;
    return { last, first: at('нэр', 'first'), jersey: at('дугаар', 'jersey'), pos: at('байр', 'pos'), height: at('өндөр', 'height'), weight: at('жин', 'weight'), note: at('тэмдэглэл', 'note') };
  }
  return DEFAULT_COLS;
}

const num = (v: string) => parseFloat(v.replace(',', '.').replace(/[^\d.]/g, ''));

/** "185", "185 см", "1.85" (метр) → 185; 120–240 см-ээс гадуур бол null */
function parseHeight(v: string): number | null {
  let n = num(v);
  if (!Number.isFinite(n)) return null;
  if (n > 0 && n < 3) n *= 100;
  n = Math.round(n);
  return n >= 120 && n <= 240 ? n : null;
}

/** "80", "80кг" → 80; 30–200 кг-аас гадуур бол null */
function parseWeight(v: string): number | null {
  const n = Math.round(num(v));
  return Number.isFinite(n) && n >= 30 && n <= 200 ? n : null;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',' || c === ';' || c === '\t') { row.push(cell.trim()); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim()); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows;
}

async function parseXlsx(buf: ArrayBuffer): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const out: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (r) => {
    const cells: string[] = [];
    for (let c = 1; c <= Math.max(8, r.cellCount); c++) {
      const v = r.getCell(c).value as unknown;
      let s = '';
      if (v == null) s = '';
      else if (typeof v === 'object' && v && 'richText' in v) s = (v as { richText: { text: string }[] }).richText.map((t) => t.text).join('');
      else if (typeof v === 'object' && v && 'result' in v) s = String((v as { result: unknown }).result ?? '');
      else if (typeof v === 'object' && v && 'text' in v) s = String((v as { text: unknown }).text ?? '');
      else s = String(v);
      cells.push(s.trim());
    }
    out.push(cells);
  });
  return out;
}

export async function previewRoster(stid: number, fd: FormData): Promise<PreviewResult> {
  const user = await requireRole(['admin', 'commissioner']);
  if (!(await canSeasonTeam(user, stid))) return { ok: false, error: 'Эрхгүй.' };
  const file = fd.get('file');
  if (!file || typeof file === 'string' || file.size === 0) return { ok: false, error: 'Файл сонгоно уу.' };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: 'Файл хэт том байна (5MB-аас бага).' };

  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  let raw: string[][];
  try {
    if (ext === 'xlsx') raw = await parseXlsx(await file.arrayBuffer());
    else if (ext === 'csv') raw = parseCsv((await file.text()).replace(/^﻿/, ''));
    else return { ok: false, error: 'Зөвхөн .xlsx эсвэл .csv файл.' };
  } catch {
    return { ok: false, error: 'Файлыг уншиж чадсангүй. Template-ийн бүтцийг шалгана уу.' };
  }

  const st = await queryOne<{ season_id: number }>('SELECT season_id FROM season_teams WHERE id=?', [stid]);
  if (!st) return { ok: false, error: 'Баг олдсонгүй.' };

  const col = detectCols(raw);
  const cell = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '').trim() : '');
  const rows: ImportRow[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    const last = cell(r, col.last);
    const first = cell(r, col.first);
    if (!last || !first || SKIP.includes(last.toLowerCase()) || last.startsWith('(')) continue;
    const key = `${last.toLowerCase()}|${first.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const j = cell(r, col.jersey);
    const jersey = /^\d{1,3}$/.test(j) && Number(j) <= 99 ? String(Number(j)) : null;
    const pos = cell(r, col.pos).toUpperCase();
    const hRaw = cell(r, col.height);
    const wRaw = cell(r, col.weight);
    const height = hRaw ? parseHeight(hRaw) : null;
    const weight = wRaw ? parseWeight(wRaw) : null;
    // Буруу утгыг тэмдэглэлд харуулна (импортод орохгүй)
    const warn = [hRaw && height === null && `Өндөр буруу: ${hRaw}`, wRaw && weight === null && `Жин буруу: ${wRaw}`].filter(Boolean).join(' · ');
    const note = [cell(r, col.note), warn].filter(Boolean).join(' · ');
    rows.push({ last, first, jersey, pos: VALID_POS.includes(pos) ? pos : null, height, weight, note, status: 'new' });
  }
  if (!rows.length) return { ok: false, error: 'Тоглогч олдсонгүй. Овог, Нэр баганыг бөглөнө үү.' };

  for (const p of rows) {
    const ex = await queryOne<{ id: number; roster_id: number | null }>(
      `SELECT pl.id, tsr.id AS roster_id FROM players pl
       LEFT JOIN team_season_roster tsr ON tsr.player_id=pl.id AND tsr.season_team_id=?
       WHERE pl.last_name=? AND pl.first_name=? ORDER BY tsr.id IS NULL, pl.id LIMIT 1`,
      [stid, p.last, p.first],
    );
    if (!ex) continue;
    if (ex.roster_id) {
      p.status = 'exists';
      continue;
    }
    const other = await query<{ name: string }>(
      `SELECT t.name FROM team_season_roster tsr JOIN season_teams st2 ON st2.id=tsr.season_team_id JOIN teams t ON t.id=st2.team_id
       WHERE st2.season_id=? AND tsr.player_id=? AND tsr.status='active' AND st2.id<>? LIMIT 1`,
      [st.season_id, ex.id, stid],
    );
    if (other.length) {
      p.status = 'conflict';
      p.conflictTeam = other[0].name;
    } else p.status = 'add';
  }
  return { ok: true, rows };
}

export async function importRoster(stid: number, rows: ImportRow[]): Promise<{ ok: boolean; message: string }> {
  const user = await requireRole(['admin', 'commissioner']);
  if (!(await canSeasonTeam(user, stid))) return { ok: false, message: 'Эрхгүй.' };
  const st = await queryOne<{ team_id: number; season_id: number }>('SELECT team_id, season_id FROM season_teams WHERE id=?', [stid]);
  if (!st) return { ok: false, message: 'Баг олдсонгүй.' };

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  await transaction(async (tx) => {
    for (const p of rows.slice(0, 100)) {
      const last = String(p.last ?? '').trim().slice(0, 80);
      const first = String(p.first ?? '').trim().slice(0, 80);
      if (!last || !first) {
        skipped++;
        continue;
      }
      const jersey = p.jersey && /^\d{1,2}$/.test(p.jersey) ? p.jersey : null;
      const pos = p.pos && VALID_POS.includes(p.pos) ? p.pos : null;
      // Client-ээс ирсэн утгыг дахин шалгана
      const height = p.height != null ? parseHeight(String(p.height)) : null;
      const weight = p.weight != null ? parseWeight(String(p.weight)) : null;
      let pid = await tx.scalar<number>(
        `SELECT pl.id FROM players pl LEFT JOIN team_season_roster tsr ON tsr.player_id=pl.id AND tsr.season_team_id=?
         WHERE pl.last_name=? AND pl.first_name=? ORDER BY tsr.id IS NULL, pl.id LIMIT 1`,
        [stid, last, first],
      );
      // Client-ээс ирсэн төлөвт итгэхгүй — өөр багт идэвхтэй эсэхийг дахин шалгана
      if (pid) {
        const busy = await tx.scalar(
          `SELECT tsr.id FROM team_season_roster tsr JOIN season_teams st2 ON st2.id=tsr.season_team_id
           WHERE st2.season_id=? AND tsr.player_id=? AND tsr.status='active' AND st2.id<>? LIMIT 1`,
          [st.season_id, pid, stid],
        );
        if (busy) {
          skipped++;
          continue;
        }
      }
      if (!pid) {
        pid = (await tx.execute('INSERT INTO players (last_name, first_name, height_cm, weight_kg, created_by_user_id) VALUES (?,?,?,?,?)', [last, first, height, weight, user.id])).insertId;
      } else if (height !== null || weight !== null) {
        // Хоосон нүд одоо байгаа утгыг арилгахгүй
        await tx.execute('UPDATE players SET height_cm=COALESCE(?::smallint, height_cm), weight_kg=COALESCE(?::smallint, weight_kg), updated_by_user_id=?, updated_at=app_now() WHERE id=?', [height, weight, user.id, pid]);
      }
      const rid = await tx.scalar<number>('SELECT id FROM team_season_roster WHERE season_team_id=? AND player_id=?', [stid, pid]);
      if (rid) {
        await tx.execute("UPDATE team_season_roster SET jersey_no=?, position=?, status='active', left_at=NULL, updated_at=app_now() WHERE id=?", [jersey, pos, rid]);
        updated++;
      } else {
        await tx.execute("INSERT INTO team_season_roster (season_team_id, team_id, player_id, jersey_no, position, status, joined_at) VALUES (?,?,?,?,?,'active',app_now()::date)", [
          stid, st.team_id, pid, jersey, pos,
        ]);
        inserted++;
      }
    }
  });
  revalidatePath('/', 'layout');
  const msg = [inserted && `${inserted} тоглогч нэмэгдлээ.`, updated && `${updated} тоглогч шинэчлэгдлээ.`, skipped && `${skipped} алгассан.`].filter(Boolean).join(' ') || 'Амжилттай.';
  await setFlash('success', msg);
  return { ok: true, message: msg };
}
