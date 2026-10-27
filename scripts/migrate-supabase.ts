import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvConfig } from '@next/env';
import { Client } from 'pg';
import { postgresConfig, postgresTypes } from '../src/lib/postgres';
import { convertDump, dataSql, ident } from './mysql-dump';

async function main() {
  loadEnvConfig(process.cwd());
  const source = readFileSync(resolve(process.cwd(), '../last base.sql'), 'utf8');
  const converted = convertDump(source);
  const indexes = readFileSync('database/recommended-indexes.sql', 'utf8');
  const restrictions = converted.tables.map((t) => `REVOKE ALL ON TABLE public.${ident(t.name)} FROM anon, authenticated;`).join('\n');
  const schema = converted.schema + '\n\n' + indexes;
  mkdirSync('database/generated', { recursive: true });
  writeFileSync('database/supabase-schema.sql', schema + '\n' + restrictions + '\n');
  writeFileSync('database/generated/supabase-import.sql', `BEGIN;\nSET LOCAL standard_conforming_strings = on;\n${schema}\n${restrictions}\n${dataSql(converted.tables)}\n${converted.sequenceSql}\nCOMMIT;\n`);
  writeFileSync('database/generated/migration-report.json', JSON.stringify(converted.report, null, 2) + '\n');
  console.log(JSON.stringify(converted.report, null, 2));
  if (!process.argv.includes('--apply')) {
    console.log('Export ready. No remote changes. Use npm run db:migrate to import into an empty Supabase project.');
    return;
  }
  const client = new Client({ ...postgresConfig(process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL), types: postgresTypes });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout = '120s'");
    await client.query('SELECT pg_advisory_xact_lock(1729027)');
    for (const table of converted.tables) {
      const found = await client.query('SELECT to_regclass($1) AS name', [`public.${table.name}`]);
      if (found.rows[0].name) throw new Error(`Target table already exists: ${table.name}. Import stopped; nothing overwritten.`);
    }
    await client.query(schema);
    await client.query(restrictions);
    for (const table of converted.tables) {
      for (let offset = 0; offset < table.rows.length; offset += 200) {
        const values: unknown[] = [];
        const rows = table.rows.slice(offset, offset + 200).map((row) => '(' + row.map((v) => { values.push(v); return `$${values.length}`; }).join(',') + ')');
        await client.query(`INSERT INTO public.${ident(table.name)} (${table.columns.map(ident).join(',')}) VALUES ${rows.join(',')}`, values);
      }
      const result = await client.query(`SELECT ${table.columns.map(ident).join(',')} FROM public.${ident(table.name)} ORDER BY id`);
      const normalize = (v: unknown) => typeof v === 'string' && /^-?\d+\.\d+$/.test(v) ? Number(v) : v;
      const expected = [...table.rows].sort((a, b) => Number(a[0]) - Number(b[0])).map((r) => r.map(normalize));
      const actual = result.rows.map((r) => table.columns.map((c) => normalize(r[c])));
      if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Data verification failed: ${table.name}`);
      console.log(`${table.name}: ${actual.length} rows imported and verified`);
    }
    await client.query(converted.sequenceSql);
    await client.query('COMMIT');
    console.log('Supabase import committed. All rows verified; identity sequences reset.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { await client.end(); }
}
main().catch((error: Error & { code?: string }) => {
  // Never print connection strings, SQL data, or database error details containing personal data.
  console.error('Migration failed:', error.code ?? error.message);
  process.exitCode = 1;
});
