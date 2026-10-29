// Локал UPLOAD_DIR дахь, DB-д ашиглагдаж буй зургуудыг Supabase Storage руу хуулна.
// Давтан ажиллуулж болно (x-upsert). Ажиллуулах: npm run storage:upload
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';
import { postgresConfig, postgresTypes } from '../src/lib/postgres';
import { BUCKET, MIME, ensureBucket, objectKey, putObject, storageEnabled } from '../src/lib/storage';

if (!storageEnabled()) {
  console.error('SUPABASE_URL болон SUPABASE_SERVICE_ROLE_KEY-г .env.local-д тохируулна уу.');
  process.exit(1);
}

const client = new Client({ ...postgresConfig(), types: postgresTypes } as never);
await client.connect();
const { rows } = await client.query<{ p: string }>(`
  SELECT logo AS p FROM leagues WHERE COALESCE(logo,'')<>''
  UNION SELECT logo_path FROM teams WHERE COALESCE(logo_path,'')<>''
  UNION SELECT photo_path FROM players WHERE COALESCE(photo_path,'')<>''
  UNION SELECT cover_image FROM news WHERE COALESCE(cover_image,'')<>''
  UNION SELECT boxscore_pdf FROM matches WHERE COALESCE(boxscore_pdf,'')<>''`);
await client.end();

console.log(`Bucket "${BUCKET}": ${await ensureBucket()}`);
const root = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');
let ok = 0;
const failed: string[] = [];
for (const { p } of rows) {
  const key = objectKey(p);
  const file = path.resolve(root, key);
  const type = MIME[path.extname(key).slice(1).toLowerCase()];
  if (!file.startsWith(root + path.sep) || !existsSync(file) || !type) {
    failed.push(`${p} (файл/төрөл байхгүй)`);
    continue;
  }
  try {
    await putObject(key, await readFile(file), type);
    ok++;
    if (ok % 25 === 0) console.log(`  ${ok}/${rows.length}`);
  } catch (e) {
    failed.push(`${p} (${(e as Error).message})`);
  }
}
console.log(`Хуулсан: ${ok}/${rows.length}`);
if (failed.length) {
  console.log('Амжилтгүй:');
  for (const f of failed) console.log('  ' + f);
  process.exitCode = 1;
}
