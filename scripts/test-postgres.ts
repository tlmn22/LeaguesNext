import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { runInNewContext } from 'node:vm';
import { TEAM_STAT_FIELDS } from '../src/lib/score-types';
import { PGlite } from '@electric-sql/pglite';
import { convertDump, dataSql, ident, readTuples } from './mysql-dump';
import { bindParams } from '../src/lib/sql-params';

async function main() {
  assert.deepEqual(readTuples("(1,'Монгол\\nтекст','O\\'Brien',NULL),(2,'a;b','it''s',1.25)"), [[1, 'Монгол\nтекст', "O'Brien", null], [2, 'a;b', "it's", '1.25']]);
  assert.deepEqual(bindParams("SELECT '?' AS literal, ? -- ?\n WHERE id IN (?)", ['x', [1, 2]]), { text: "SELECT '?' AS literal, $1 -- ?\n WHERE id IN ($2,$3)", values: ['x', 1, 2] });
  const migration = convertDump(readFileSync('../last base.sql', 'utf8'));
  const db = new PGlite({ parsers: { 20: Number, 1700: Number, 1082: (v) => v, 1114: (v) => v } });
  try {
    await db.exec(migration.schema);
    await db.exec(readFileSync('database/recommended-indexes.sql', 'utf8'));
    await db.exec(dataSql(migration.tables));
    await db.exec(migration.sequenceSql);
    for (const table of migration.tables) {
      const { rows } = await db.query<Record<string, unknown>>(`SELECT * FROM ${ident(table.name)} ORDER BY id`);
      const norm = (v: unknown) => typeof v === 'string' && /^-?\d+\.\d+$/.test(v) ? Number(v) : v;
      const expected = [...table.rows].sort((a, b) => Number(a[0]) - Number(b[0])).map((r) => r.map(norm));
      assert.deepEqual(rows.map((r) => table.columns.map((c) => norm(r[c]))), expected, `${table.name} full data round trip`);
    }
    console.log(`Verified ${migration.report.totalRows} rows across ${migration.tables.length} tables, including hashes, Unicode and dates.`);

    const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
    const statements = new Map<string, string>();
    const templates: { file: string; sql: string; constants: Record<string, string> }[] = [];
    const shared: Record<string, string> = {};
    for (const file of walk('src').filter((f) => /\.tsx?$/.test(f) && !/[/\\](db|postgres|sql-params)\.ts$/.test(f))) {
      const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
      const constants: Record<string, string> = {};
      const collect = (node: ts.Node) => {
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))) {
          constants[node.name.text] = node.initializer.text;
          if (node.name.text === 'MATCH_ROW_SQL') shared.MATCH_ROW_SQL = node.initializer.text;
        }
        ts.forEachChild(node, collect);
      };
      collect(source);
      const visit = (node: ts.Node) => {
        if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && /^\s*(SELECT|INSERT INTO|UPDATE|DELETE FROM)\b/i.test(node.text)) statements.set(node.text, file);
        if (ts.isTemplateExpression(node) && (/^\s*(SELECT|INSERT INTO|UPDATE|DELETE FROM)\b/i.test(node.head.text) || node.templateSpans[0]?.expression.getText(source) === 'MATCH_ROW_SQL')) templates.push({ file, sql: node.getText(source), constants });
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    let checked = 0;
    for (const [sql, file] of statements) {
      // Strings ending in WHERE/AND are fragments completed by the caller.
      if (/\b(?:WHERE|AND|OR|SET|ORDER BY)\s*$/i.test(sql)) continue;
      const count = (sql.match(/\?/g) ?? []).length;
      const bound = bindParams(sql, Array(count).fill(null));
      try { await db.query('EXPLAIN ' + bound.text, bound.values); checked++; }
      catch (error) { throw new Error(`SQL validation failed in ${file}: ${(error as Error).message}\n${sql}`); }
    }
    let dynamicChecked = 0;
    for (const template of templates) {
      for (const enabled of [false, true]) {
        const context = { ...shared, ...template.constants, TEAM_STAT_FIELDS, col: 'mps.points', LOCK_MIN: 5,
          logo: enabled, photo: enabled, sid: enabled, seasonId: enabled, isAdm: !enabled, filter: enabled,
          teamFilter: enabled, showAll: enabled, user: { role: enabled ? 'commissioner' : 'admin' },
          status: enabled ? 'submitted' : 'pending', order: enabled ? 'ASC' : 'DESC', where: [], w: '', lgWhere: enabled ? 'WHERE s.league_id=?' : '', genderFilter: '',
        };
        const sql = runInNewContext(template.sql, context, { timeout: 1000 }) as string;
        const bound = bindParams(sql, Array((sql.match(/\?/g) ?? []).length).fill(null));
        try { await db.query('EXPLAIN ' + bound.text, bound.values); dynamicChecked++; }
        catch (error) { throw new Error('Dynamic SQL failed in ' + template.file + ': ' + (error as Error).message + '\n' + sql); }
      }
    }
    console.log('PostgreSQL planned ' + checked + ' static queries and ' + dynamicChecked + ' dynamic SQL scenarios.');

    await db.exec('BEGIN');
    const inserted = await db.query<{ id: number }>("INSERT INTO teams(name) VALUES ('Migration test') RETURNING id");
    assert.ok(inserted.rows[0].id >= 149, 'Identity follows source AUTO_INCREMENT');
    await db.query("INSERT INTO match_status(match_id,period,home_score,away_score) VALUES (6,'Q1',1,2) ON CONFLICT (match_id,period) DO UPDATE SET home_score=EXCLUDED.home_score");
    assert.equal((await db.query<{ home_score: number }>("SELECT home_score FROM match_status WHERE match_id=6 AND period='Q1'")).rows[0].home_score, 1);
    const before = (await db.query('SELECT COUNT(*) AS n FROM stat_manager_assignments')).rows;
    await db.query("INSERT INTO stat_manager_assignments(match_id,user_id) SELECT match_id,user_id FROM stat_manager_assignments LIMIT 1 ON CONFLICT(match_id,user_id) DO NOTHING");
    assert.deepEqual((await db.query('SELECT COUNT(*) AS n FROM stat_manager_assignments')).rows, before);
    const average = await db.query<{ n: number }>('SELECT ROUND(SUM(n)::numeric/COUNT(*),1) AS n FROM (VALUES(1),(2)) t(n)');
    assert.equal(average.rows[0].n, 1.5);
    await db.exec('ROLLBACK');
    assert.equal((await db.query("SELECT id FROM teams WHERE name='Migration test'")).rows.length, 0);
    await db.exec('CREATE ROLE anon; GRANT USAGE ON SCHEMA public TO anon; GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon; SET ROLE anon;');
    assert.equal((await db.query('SELECT * FROM users')).rows.length, 0, 'RLS hides private tables from API roles');
    await db.exec('RESET ROLE');
    console.log('Identity, upsert, conflict handling, decimal averages, rollback and RLS checks passed.');
  } finally { await db.close(); }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
