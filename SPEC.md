# Quote Desk — SPEC

Independent demo inspired by the problem space of GUILD (YC S26). Not affiliated. A machine-shop quoting + capacity desk for generic precision-machined aerospace parts (brackets, housings, fittings).

## Honesty requirements
- Header badge: "Sample data - demo".
- Copy states all numbers are invented sample data and flags are plain deterministic arithmetic.
- No real customer/defense claims, no live-data implications.
- Footer: "Independent demo built by Vinil Polepalli. Not affiliated with or endorsed by GUILD."

## Tech
Next.js (App Router, TypeScript), `output: 'export'`, no runtime external calls (no remote fonts/APIs). `npm run build` must pass. No git commit, no deploy.

## Data
- `catalog`: 6 sample parts: id, name, material, stock (L×W×H mm), features (pockets, holes, thinWallMm?, tightBores), tolerance class (STD / PRECISION / ULTRA), default qty.
- `materials`: cost/kg, density, machinability factor.
- `assumptions` (editable): hourly rates (3-axis, 5-axis, grinder, CMM), machine-hours/week, setup hours per setup, setup rate, material markup, backlog hours (sample).

## Engine (pure functions, `lib/engine.ts`)
- Material cost = stock volume × density × $/kg × qty.
- Cycle time/part = base (feature counts × per-feature minutes × machinability) + grind min (PRECISION/ULTRA bores) + CMM min (tolerance class).
- Costs: material, setup (setups × setup hrs × rate, once per lot), machine (cycle × qty × rate), inspection (CMM time × rate). Total, per-unit.
- Machine-hours needed = setup hrs + machine hrs + inspection hrs.
- Lead time = ceil((backlog + needed) / weekly capacity) weeks + fixed finishing days.
- Flags (first match wins): CAPACITY TIGHT if (backlog+needed)/capacity > 0.85; REVIEW PROCESS if ULTRA tolerance, tight bores, or wall < 1.5 mm; else QUOTE OK. Reasons listed.

## UI
Single page, dark, LIME accent (#a3e635 family). Part selector list with per-part flag chips; quote panel (inputs: qty, material, tolerance; cost breakdown bar/table, cycle time, lead time, reasons); assumptions editor; week capacity bar (backlog vs. this quote vs. free machine-hours). Disclaimer panel.

## Slices
1. Scaffold + SPEC. 2. Data + engine + tests (node script). 3. UI. 4. Build verify.
