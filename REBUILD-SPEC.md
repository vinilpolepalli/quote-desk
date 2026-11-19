# Quote Desk v2 - high-fidelity rebuild spec

Rebuild this static demo into a real working product with a live backend. Maps to GUILD (guildai.co, YC S26): an AI-native defense prime that turns technical packages into production workflows and routes parts across vetted US factories. Quote Desk demonstrates the quoting-to-capacity core: deterministic part quoting, an order book that commits machine-hours, and lead times that respond to real committed load.

Do not deploy, do not git commit, do not push. No paid services, no API keys, no randomness (pure functions). Parts stay generic and non-sensitive: brackets, housings, fittings. Nothing weapons-related anywhere in copy.

## Architecture
- Next.js App Router + TypeScript + Tailwind, SERVER runtime (remove output:'export').
- Drizzle ORM: SQLite (quotedesk.db) dev; Postgres via DATABASE_URL prod.
- Keep the existing deterministic engine (material cost, cycle time, cost breakdown, lead time, flags) as the pure tested core, moved server-side, unit-tested (npm test).
- Sample part catalog (6 parts) and default shop assumptions seeded into the DB per owner, clearly labeled SAMPLE.

## Product workflow (fitted to THIS product)
1. Home = the desk: capacity bar for the next weeks (committed machine-hours vs weekly capacity), open quotes list, first action (New quote) above the fold on mobile.
2. New quote: pick a catalog part or enter custom part inputs (material, stock dims, feature counts, tolerance class, quantity). Engine computes cycle time, cost breakdown (material/setup/machine/inspection), machine-hours, lead time from CURRENT committed load, and the flag with reasons. Save as a persisted quote. Editing re-saves a new revision (revision history visible).
3. Shop assumptions page: hourly rates, machine-hours/week, setup hours, markup, starting backlog - editable, persisted per owner; recomputes quotes derived from them on next view (store the assumption version with each quote revision so old quotes stay explainable: show which assumptions version priced it).
4. ORDER BOOK (the differentiator): accept a quote -> it commits its machine-hours into the calendar weeks starting after current backlog, persisted. Subsequent quotes see the committed load and quote longer lead times. Cancel/reject frees the hours again. The capacity view shows committed vs available per week. Deterministic, fully explainable: each week lists which accepted orders consume its hours.
5. Every flag reason and every formula visible per quote line (expandable), costs labeled sample.

## Truthfulness bar
- SAMPLE labels on catalog, rates, backlog. Engine math is exact and shown per line.
- No claims about real factories, real lead times, customers, or defense work; footer: "Independent demo built by Vinil Polepalli. Sample data and deterministic arithmetic only. Not affiliated with or endorsed by GUILD."

## Abuse and isolation controls
- Owner cookie (qd_uid, httpOnly); quotes/orders/assumptions owner-scoped; cross-owner 403/404.
- Rate limits: 120 writes/hour/owner, 413 at 20KB; numeric inputs validated (dims 0-10000mm, qty 1-100000, rates 0-10000).

## UI bar
- Light theme, near-white ground, hairlines, small-caps labels, tabular nums, system stack; mono for numbers where it aids scanning.
- Brand accent: deep olive #4d7c0f (hover #3f6212). Deliberate: shop-floor/industrial read, keeps continuity with the v1 lime accent while working on a light ground, outside indigo/violet, distinct from sibling demos (navy/teal/bronze/crimson/burnt-orange). Comment the rationale in tailwind.config.ts.
- Pills only for status chips; buttons 8px, cards 10px, inputs 8px; no gradients, no emoji icons, no hero+3-cards, no amber-50 fills.
- Layout fitted to a quoting desk (quote sheet + capacity strip + order book), not a clone of sibling demos. Mobile: stacked, quote form usable one-handed.

## Definition of done
- npm run build + npm test pass.
- Real end-to-end: run server; create a quote via API; hand-check one part's full breakdown against the engine formulas; accept it and verify the next quote's lead time lengthens by the committed hours; cancel and verify it shortens; edit assumptions and verify repricing; persistence across restart; owner isolation; rate limit.
- python3 ~/unslop/devibe_scan.py . - zero high or justified unslop-ignore comments.
- README + IMPLEMENTATION.md (data model, endpoints, verification results).
- Screenshots to /tmp: qd2-desk.png, qd2-quote.png, qd2-capacity.png, qd2-mobile.png (390px) from the RUNNING app.
