import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

type DrizzleDB = NodePgDatabase<typeof schema>;

let _db: DrizzleDB | null = null;
let _pool: Pool | null = null;

/** Shared pg Pool — reused by Drizzle and Better Auth */
export function getPool(): Pool {
  if (!_pool) {
    const connStr = process.env.DATABASE_URL || process.env.DATABASE_URI;
    if (!connStr) {
      throw new Error("Missing DATABASE_URL or DATABASE_URI environment variable");
    }
    _pool = new Pool({
      connectionString: connStr,
      min: 2,
      max: 25,
      idleTimeoutMillis: 60_000,
      connectionTimeoutMillis: 10_000,
      keepAlive: true,
    });

    _pool.on("error", (err) => {
      console.error("[pg pool] Unexpected idle client error:", err.message);
    });
  }
  return _pool;
}

export function getDb(): DrizzleDB {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}

export const db = new Proxy({} as DrizzleDB, {
  get(_, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
