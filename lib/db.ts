import path from "node:path";
import { sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema.ts";
import * as pgSchema from "../db/schema.pg.ts";

export type Schema = typeof schema;
type Orm = BetterSQLite3Database<Schema>;

/**
 * Data-layer handle. SQLite (quotedesk.db) is the default; Postgres is used when DATABASE_URL is a postgres URL.
 * The Postgres tables/ORM are typed as their SQLite twins: both builders share the awaited API the store
 * uses (never .all/.get/.run). Always query through `t` (driver-specific tables), and `await` every query.
 */
export interface Db {
  kind: "sqlite" | "postgres";
  orm: Orm;
  t: Schema;
  /** Runs fn atomically. Nested calls on SQLite join the outer transaction. */
  tx<T>(fn: (c: Db) => Promise<T>): Promise<T>;
  /** Serializes work on SQLite (single connection, manual BEGIN/COMMIT); passthrough on Postgres. */
  exclusive<T>(fn: () => Promise<T>): Promise<T>;
}

const PG_URL = /^postgres(ql)?:\/\//i;

/** Postgres bootstrap DDL, mirroring db/schema.ts (same columns/constraints). */
export const PG_DDL = [
  `CREATE TABLE IF NOT EXISTS "owners" ("id" TEXT PRIMARY KEY, "created_at" TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "parts" ("row_id" INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, "owner_id" TEXT NOT NULL, "part_id" TEXT NOT NULL, "data" TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "assumption_versions" ("row_id" INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, "owner_id" TEXT NOT NULL, "version" INTEGER NOT NULL, "data" TEXT NOT NULL, "created_at" TEXT NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "av_owner_ver" ON "assumption_versions" ("owner_id", "version")`,
  `CREATE TABLE IF NOT EXISTS "quotes" ("id" TEXT PRIMARY KEY, "owner_id" TEXT NOT NULL, "number" INTEGER NOT NULL, "status" TEXT NOT NULL, "created_at" TEXT NOT NULL, "accepted_seq" INTEGER, "committed_hours" DOUBLE PRECISION)`,
  `CREATE TABLE IF NOT EXISTS "quote_revisions" ("row_id" INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, "quote_id" TEXT NOT NULL, "rev" INTEGER NOT NULL, "assumptions_version" INTEGER NOT NULL, "committed_load_at_pricing" DOUBLE PRECISION NOT NULL, "part" TEXT NOT NULL, "result" TEXT NOT NULL, "created_at" TEXT NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "qr_quote_rev" ON "quote_revisions" ("quote_id", "rev")`,
  `CREATE TABLE IF NOT EXISTS "allocations" ("row_id" INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, "owner_id" TEXT NOT NULL, "order_id" TEXT NOT NULL, "week" INTEGER NOT NULL, "hours" DOUBLE PRECISION NOT NULL)`,
];

async function openSqlite(file: string): Promise<Db> {
  const [{ default: Database }, { drizzle }, { migrate }] = await Promise.all([
    import("better-sqlite3"), import("drizzle-orm/better-sqlite3"), import("drizzle-orm/better-sqlite3/migrator"),
  ]);
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  const orm = drizzle(sqlite, { schema });
  migrate(orm, { migrationsFolder: path.join(process.cwd(), "drizzle", "sqlite") });
  let chain: Promise<unknown> = Promise.resolve();
  let inTx = false;
  const c: Db = {
    kind: "sqlite", orm, t: schema,
    async tx(fn) {
      if (inTx) return fn(c); // nested: join the outer transaction
      inTx = true;
      orm.run(sql`BEGIN IMMEDIATE`);
      try {
        const r = await fn(c);
        orm.run(sql`COMMIT`);
        return r;
      } catch (e) {
        orm.run(sql`ROLLBACK`);
        throw e;
      } finally { inTx = false; }
    },
    exclusive(fn) {
      const run = chain.then(fn, fn);
      chain = run.catch(() => undefined);
      return run;
    },
  };
  return c;
}

async function openPg(url: string): Promise<Db> {
  const [{ default: postgres }, { drizzle }] = await Promise.all([import("postgres"), import("drizzle-orm/postgres-js")]);
  const client = postgres(url, { max: 5, onnotice: () => {} });
  try {
    // Advisory lock so concurrently starting instances don't race on CREATE TABLE IF NOT EXISTS.
    await client.begin(async (q) => {
      await q`SELECT pg_advisory_xact_lock(7316403)`;
      for (const stmt of PG_DDL) await q.unsafe(stmt);
    });
  } catch (e) { await client.end({ timeout: 1 }).catch(() => {}); throw e; }
  const mk = (orm: Orm): Db => ({
    kind: "postgres", orm, t: pgSchema as unknown as Schema,
    tx: (fn) => (orm as unknown as { transaction: (f: (tx: Orm) => Promise<never>) => Promise<never> })
      .transaction((tx) => fn(mk(tx)) as Promise<never>),
    exclusive: (fn) => fn(),
  });
  return mk(drizzle(client, { schema: pgSchema }) as unknown as Orm);
}

const g = globalThis as unknown as { __qd?: Promise<Db> };
export function getDb(): Promise<Db> {
  if (!g.__qd) {
    const url = process.env.DATABASE_URL;
    const open = () => url && PG_URL.test(url)
      ? openPg(url)
      : openSqlite(process.env.QD_DB_PATH ?? path.join(process.cwd(), "quotedesk.db"));
    g.__qd = open().catch((e) => { g.__qd = undefined; throw e; }); // allow retry after a failed open
  }
  return g.__qd;
}
export { schema };
