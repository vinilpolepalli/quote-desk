# Implementation notes

## Layout
- `lib/engine.ts`, `lib/data.ts`, `lib/allocate.ts`, `lib/validate.ts`: pure, tested core (no I/O). Engine returns per-line formulas (`lines`).
- `lib/store.ts`: all DB access (Drizzle + better-sqlite3), owner-scoped. `lib/http.ts`: owner cookie check, rate limit, body size, error mapping.
- `proxy.ts`: issues the httpOnly `qd_uid` cookie. `app/api/*`: JSON endpoints. `app/*`, `components/*`: UI (server-rendered pages, small client forms).

## Data model (SQLite)
- `owners(id, created_at)`; seeded per owner on first visit.
- `parts(owner_id, part_id, data)`: SAMPLE catalog, 6 parts per owner.
- `assumption_versions(owner_id, version, data)`: append-only; every edit is a new version.
- `quotes(id, owner_id, number, status open|accepted|cancelled|rejected, accepted_seq, committed_hours)`.
- `quote_revisions(quote_id, rev, assumptions_version, committed_load_at_pricing, part, result)`: every edit is a new revision recording which assumptions version priced it.
- `allocations(owner_id, order_id|BACKLOG, week, hours)`: persisted week-by-week hours.

## Order book rules
Load ahead of a new quote = starting backlog + hours of accepted orders. Lead weeks = ceil((load + needed) / weekly capacity). Backlog fills weeks first, then accepted orders in acceptance order fill sequentially. Accept commits the latest revision's machine-hours (409 if priced under older assumptions); cancel of an accepted order frees them and later orders move up; reject applies to open quotes. Allocations are rebuilt on accept, cancel, and assumptions save. Open quotes are repriced live under current assumptions and load on view; accepted orders keep their committed hours.

## Endpoints (all owner-scoped via cookie)
GET /api/catalog; GET, PUT /api/assumptions (PUT = new version); GET /api/capacity?weeks=; GET /api/orders; GET, POST /api/quotes; POST /api/quotes/preview; GET, PUT /api/quotes/:id (PUT = new revision); POST /api/quotes/:id/accept|cancel|reject.
Limits: 120 writes/hour/owner (429, in-memory per process, resets on restart), 413 above 20KB, inputs validated (dims 0-10000 mm, qty 1-100000, rates 0-10000; capacity >= 1). Another owner's quote id returns 404.

## Verification (run against the built server, fresh DB)
- `npm run build` passes; `npm test` 11/11 pass.
- BRK-100 x50 at default assumptions: cycle 36 min; material 194.40; setup 270.00; machine 2550.00; inspection 158.33; total 3172.73; 34.67 h. Matches the hand calculation (also asserted in the unit test).
- Lead time: load 45 h -> 1 wk/7 d; after accepting (34.67 h) load 79.67 -> 8 d, CAPACITY TIGHT. With capacity 100 h: two accepted orders -> load 114.34, 2 wk; cancelling the first -> 79.67 h, order 3 moves up in the capacity table.
- Assumptions edit (3-axis 85 -> 100, capacity 120 -> 100): stored quote 3172.73 (v1), live repricing 3622.73 (v2); accept returned 409 until re-saved as revision 2 at v2.
- Persistence: server restarted; quotes, committed load (79.67) and assumptions v2 survived.
- Isolation: a second owner got 404 for GET and accept on the first owner's quote and an empty quote list.
- Validation/limits: qty 100001 -> 400; 21KB body -> 413; 125 rapid writes -> 429 after the 120th.
- `python3 ~/unslop/devibe_scan.py .`: 0 high; 1 medium (rounded-full pills, which the spec requires for status chips). No ignore comments.
- Screenshots from the running app: /tmp/qd2-desk.png, qd2-quote.png, qd2-capacity.png, qd2-mobile.png (390px, no horizontal overflow).

## Known gaps
- Postgres runtime not implemented (schema/config only).
- Rate-limit counters are in memory.
- Preview pricing is not counted as a write.
