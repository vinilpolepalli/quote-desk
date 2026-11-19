import { defineConfig } from "drizzle-kit";

const pg = !!process.env.DATABASE_URL;
export default defineConfig({
  schema: pg ? "./db/schema.pg.ts" : "./db/schema.ts",
  out: pg ? "./drizzle/pg" : "./drizzle/sqlite",
  dialect: pg ? "postgresql" : "sqlite",
  dbCredentials: pg ? { url: process.env.DATABASE_URL! } : { url: "quotedesk.db" },
});
