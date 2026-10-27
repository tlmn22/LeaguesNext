import { readFileSync } from 'node:fs';
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
export function postgresConfig(connectionString = process.env.DATABASE_URL): PoolConfig {
  if (!connectionString) throw new Error('DATABASE_URL тохируулаагүй байна. .env.local файлд Supabase PostgreSQL URI оруулна уу.');
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL must be a PostgreSQL URI');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  return {
    connectionString: url.toString(),
    ssl: local ? false : {
      rejectUnauthorized: true,
      ...(process.env.DATABASE_SSL_CA_FILE ? { ca: readFileSync(process.env.DATABASE_SSL_CA_FILE, 'utf8') } : {}),
    },
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    application_name: 'leagues-next',
  };
}
