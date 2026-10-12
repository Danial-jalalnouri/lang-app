import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Scripts run via tsx don't get Next's .env.local loading — load it once as fallback.
if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_UNPOOLED) {
  try {
    process.loadEnvFile(resolve(process.cwd(), ".env.local"));
  } catch {
    // no .env.local — env must come from the process (e.g. Vercel)
  }
}

function connectionString(): string {
  // Prefer the pooled endpoint for the app (serverless-friendly);
  // DATABASE_URL_UNPOOLED is available for heavy one-off jobs.
  const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
  if (!url) {
    throw new Error(
      "Missing DATABASE_URL — run `neon link` (writes .env.local) or set it in your environment.",
    );
  }
  return url;
}

const globalForDb = globalThis as unknown as {
  __pgPool?: Pool;
  __pgSchemaReady?: Promise<void>;
};

export function getPool(): Pool {
  if (!globalForDb.__pgPool) {
    globalForDb.__pgPool = new Pool({ connectionString: connectionString(), max: 5 });
  }
  return globalForDb.__pgPool;
}

export function ensureSchema(): Promise<void> {
  if (!globalForDb.__pgSchemaReady) {
    const schema = readFileSync(resolve(process.cwd(), "src/db/schema.sql"), "utf-8");
    globalForDb.__pgSchemaReady = getPool()
      .query(schema)
      .then(() => undefined);
  }
  return globalForDb.__pgSchemaReady;
}

/** Positional-parameter query ($1, $2, …). */
export async function query<T = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  await ensureSchema();
  const res = await getPool().query(sql, params);
  return res.rows as unknown as T[];
}

export async function execute(sql: string, params: unknown[] = []): Promise<void> {
  await ensureSchema();
  await getPool().query(sql, params);
}

/** Runs fn inside a BEGIN/COMMIT transaction on a dedicated connection. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
