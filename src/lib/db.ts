import 'server-only';
import { Pool, type PoolClient } from 'pg';
import { postgresConfig, postgresTypes } from './postgres';
import { bindParams } from './sql-params';

const g = globalThis as unknown as { __lmPostgres?: Pool };
function getPool(): Pool {
  if (!g.__lmPostgres) {
    g.__lmPostgres = new Pool({ ...postgresConfig(), types: postgresTypes });
    g.__lmPostgres.on('error', (error) => {
      console.error('[postgres pool]', { code: (error as Error & { code?: string }).code });
    });
  }
  return g.__lmPostgres;
}
type Param = string | number | boolean | null | Date | Buffer | Param[];
export type Row = Record<string, unknown>;
export type WriteResult = { insertId: number; affectedRows: number };
export type Tx = {
  query: <T = Row>(sql: string, params?: Param[]) => Promise<T[]>;
  queryOne: <T = Row>(sql: string, params?: Param[]) => Promise<T | null>;
  scalar: <T = number>(sql: string, params?: Param[]) => Promise<T | null>;
  execute: (sql: string, params?: Param[]) => Promise<WriteResult>;
};
function wrap(client: Pool | PoolClient): Tx {
  const query = async <T = Row>(sql: string, params: Param[] = []): Promise<T[]> => {
    const { text, values } = bindParams(sql, params);
    return (await client.query(text, values)).rows as T[];
  };
  return {
    query,
    queryOne: async <T = Row>(sql: string, params: Param[] = []) => (await query<T>(sql, params))[0] ?? null,
    scalar: async <T = number>(sql: string, params: Param[] = []) => {
      const row = (await query<Row>(sql, params))[0];
      return row ? Object.values(row)[0] as T : null;
    },
    execute: async (sql: string, params: Param[] = []) => {
      // All application tables have an identity id; retain the server-action return contract.
      const statement = /^\s*INSERT\s/i.test(sql) && !/\bRETURNING\b/i.test(sql)
        ? sql.replace(/;\s*$/, '') + ' RETURNING id' : sql;
      const { text, values } = bindParams(statement, params);
      const result = await client.query(text, values);
      return { insertId: Number(result.rows[0]?.id ?? 0), affectedRows: result.rowCount ?? 0 };
    },
  };
}
export async function query<T = Row>(sql: string, params: Param[] = []): Promise<T[]> {
  return wrap(getPool()).query<T>(sql, params);
}
export async function queryOne<T = Row>(sql: string, params: Param[] = []): Promise<T | null> {
  return wrap(getPool()).queryOne<T>(sql, params);
}
export async function scalar<T = number>(sql: string, params: Param[] = []): Promise<T | null> {
  return wrap(getPool()).scalar<T>(sql, params);
}
export async function execute(sql: string, params: Param[] = []): Promise<WriteResult> {
  return wrap(getPool()).execute(sql, params);
}
export async function transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(wrap(client));
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
