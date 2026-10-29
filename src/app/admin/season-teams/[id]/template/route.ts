import ExcelJS from 'exceljs';
import { canManageLeague, getUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

// Roster-ийн Excel template — одоогийн идэвхтэй roster-оор урьдчилан бөглөнө
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user || !['admin', 'commissioner'].includes(user.role)) return new Response('Эрхгүй', { status: 403 });

  const stid = parseInt((await ctx.params).id, 10) || 0;
  const st = await queryOne<{ team_name: string; league_id: number }>(
    'SELECT t.name AS team_name, s.league_id FROM season_teams st JOIN teams t ON t.id=st.team_id JOIN seasons s ON s.id=st.season_id WHERE st.id=?',
    [stid],
  );
  if (!st) return new Response('Баг олдсонгүй', { status: 404 });
  if (!canManageLeague(user, st.league_id)) return new Response('Эрхгүй', { status: 403 });

  const roster = await query<{ last_name: string; first_name: string; jersey_no: string | null; position: string | null; height_cm: number | null; weight_kg: number | null }>(
    `SELECT p.last_name, p.first_name, tsr.jersey_no, tsr.position, p.height_cm, p.weight_kg
     FROM team_season_roster tsr JOIN players p ON p.id=tsr.player_id
     WHERE tsr.season_team_id=? AND tsr.status='active'
     ORDER BY (tsr.jersey_no IS NULL OR tsr.jersey_no=''), CASE WHEN tsr.jersey_no ~ '^[0-9]+$' THEN tsr.jersey_no::integer ELSE 0 END, p.last_name`,
    [stid],
  );

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Roster');
  ws.columns = [
    { header: '#', width: 5 },
    { header: 'Овог', width: 22 },
    { header: 'Нэр', width: 22 },
    { header: 'Дугаар', width: 9 },
    { header: 'Байр', width: 9 },
    { header: 'Өндөр (см)', width: 12 },
    { header: 'Жин (кг)', width: 10 },
    { header: 'Тэмдэглэл', width: 30 },
  ];
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8601C' } };
  ws.addRow(['', '(Байр: PG, SG, SF, PF, C · Өндөр см-ээр (185), жин кг-аар (80) — заавал биш)', '', '', '', '', '', '']).font = { italic: true, color: { argb: 'FF888888' } };

  const rows = roster.length
    ? roster.map((r, i) => [i + 1, r.last_name, r.first_name, r.jersey_no ?? '', r.position ?? '', r.height_cm || '', r.weight_kg || '', ''])
    : [1, 2, 3].map((n) => [n, '', '', '', '', '', '', '']);
  for (const r of rows) ws.addRow(r);

  const buf = await wb.xlsx.writeBuffer();
  const safe = st.team_name.replace(/[^A-Za-z0-9_-]+/g, '_') || 'team';
  return new Response(buf as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="roster_${safe}.xlsx"; filename*=UTF-8''${encodeURIComponent(`roster_${st.team_name}.xlsx`)}`,
    },
  });
}
