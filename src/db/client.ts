import { createClient, type Client } from "@libsql/client";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_FILE_URL = "file:data/dev.db";

function connectionConfig() {
  const url = process.env.TURSO_DATABASE_URL ?? DEFAULT_FILE_URL;
  if (url.startsWith("file:")) {
    const path = resolve(url.slice("file:".length));
    mkdirSync(dirname(path), { recursive: true });
    return { url: `file:${path}` };
  }
  return { url, authToken: process.env.TURSO_AUTH_TOKEN };
}

const globalForDb = globalThis as unknown as { __db?: Client; __dbReady?: Promise<void> };

export function getDb(): Client {
  if (!globalForDb.__db) {
    globalForDb.__db = createClient(connectionConfig());
  }
  return globalForDb.__db;
}

export function ensureSchema(): Promise<void> {
  if (!globalForDb.__dbReady) {
    const db = getDb();
    const schema = readFileSync(
      resolve(process.cwd(), "src/db/schema.sql"),
      "utf-8",
    );
    globalForDb.__dbReady = db.executeMultiple(schema).then(() => undefined);
  }
  return globalForDb.__dbReady;
}

export type SqlArgs = unknown[] | Record<string, unknown>;

export async function query<T>(sql: string, args: SqlArgs = []): Promise<T[]> {
  await ensureSchema();
  const result = await getDb().execute({ sql, args: args as never });
  return result.rows as unknown as T[];
}

export async function execute(sql: string, args: SqlArgs = []): Promise<void> {
  await ensureSchema();
  await getDb().execute({ sql, args: args as never });
}
