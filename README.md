# Quote Desk v2

Independent demo built by Vinil Polepalli. Sample data and deterministic arithmetic only. Not affiliated with or endorsed by GUILD.

A machine-shop quoting desk with a live backend: deterministic part quoting, an order book that commits machine-hours into calendar weeks, and lead times that respond to the committed load. All parts, rates and the starting backlog are invented SAMPLE values.

## Run
```
npm install
npm run build
npm start            # http://localhost:3000, creates quotedesk.db (SQLite) in the repo root
npm test             # unit tests for the pure engine, allocator and validators
npm run dev          # development server
```
Env: `QD_DB_PATH` overrides the SQLite file location. `PORT` via `next start -p`.

## Database
SQLite via Drizzle (`db/schema.ts`, migrations in `drizzle/sqlite`, applied at startup). A Postgres schema mirror (`db/schema.pg.ts`) and `drizzle.config.ts` switch on `DATABASE_URL` for migration generation, but the runtime store (`lib/db.ts`, `lib/store.ts`) only uses the SQLite driver. Postgres at runtime is not wired up or tested.

See IMPLEMENTATION.md for the data model, endpoints and verification results.
