import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

// Dual-driver: DB_DRIVER=pg uses node-postgres (standard), otherwise uses Neon HTTP
const USE_PG = process.env.DB_DRIVER === "pg";

type DrizzleDB = NodePgDatabase<typeof schema>;

let _db: DrizzleDB | null = null;

export function getDb(): DrizzleDB {
  if (!_db) {
    const connStr = process.env.DATABASE_URL || process.env.DATABASE_URI;
    if (!connStr) {
      throw new Error("Missing DATABASE_URL or DATABASE_URI environment variable");
    }

    if (USE_PG) {
      const { Pool } = require("pg") as typeof import("pg");
      const { drizzle } = require("drizzle-orm/node-postgres") as typeof import("drizzle-orm/node-postgres");
      const pool = new Pool({ connectionString: connStr });
      _db = drizzle(pool, { schema });
    } else {
      const { neon } = require("@neondatabase/serverless") as typeof import("@neondatabase/serverless");
      const { drizzle } = require("drizzle-orm/neon-http") as typeof import("drizzle-orm/neon-http");
      _db = drizzle(neon(connStr), { schema }) as unknown as DrizzleDB;
    }
  }
  return _db;
}

export const db = new Proxy({} as DrizzleDB, {
  get(_, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
