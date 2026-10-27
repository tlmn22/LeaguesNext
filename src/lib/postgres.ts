import { readFileSync } from 'node:fs';
import path from 'node:path';
import { types, type PoolConfig } from 'pg';

// Preserve numeric IDs/counts and local wall-clock dates used throughout the application.
export const postgresTypes = {
  getTypeParser(oid: number, format?: string) {
    if (!format || format === 'text') {
      if (oid === 20) return (value: string) => {
        const number = Number(value);
        if (!Number.isSafeInteger(number)) throw new Error('PostgreSQL integer exceeds JavaScript safe range');
        return number;
      };
      if (oid === 1700) return Number;
      if (oid === 1082 || oid === 1114) return (value: string) => value;
    }
    return types.getTypeParser(oid, format as 'text');
  },
};
// Repo-д байгаа Supabase CA — Vercel зэрэг орчинд DATABASE_SSL_CA_FILE-гүйгээр ажиллана (next.config-д trace хийгдэнэ)
const BUNDLED_CA = 'database/certs/supabase-ca.crt';

/** CA: DATABASE_SSL_CA (PEM текст) → DATABASE_SSL_CA_FILE → repo-ийн сертификат */
function sslCa(): string | undefined {
  if (process.env.DATABASE_SSL_CA) return process.env.DATABASE_SSL_CA.replace(/\\n/g, '\n');
  for (const file of [process.env.DATABASE_SSL_CA_FILE, BUNDLED_CA]) {
    if (!file) continue;
    try {
      return readFileSync(path.resolve(process.cwd(), file), 'utf8');
    } catch {
      console.warn('[postgres] CA файл уншигдсангүй:', file);
    }
  }
  return undefined;
}

export function postgresConfig(connectionString = process.env.DATABASE_URL): PoolConfig {
  if (!connectionString) throw new Error('DATABASE_URL тохируулаагүй байна. .env.local файлд Supabase PostgreSQL URI оруулна уу.');
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL must be a PostgreSQL URI');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  const ca = local ? undefined : sslCa();
  return {
    connectionString: url.toString(),
    ssl: local ? false : { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    application_name: 'leagues-next',
  };
}
