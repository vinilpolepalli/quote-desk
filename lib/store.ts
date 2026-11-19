import { and, desc, eq, inArray, max, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb, schema as s } from "./db.ts";
import type { Db } from "./db.ts";
import { catalog, defaultAssumptions } from "./data.ts";
import type { Assumptions, Part } from "./data.ts";
import { quote as priceQuote } from "./engine.ts";
import type { Quote } from "./engine.ts";
import { allocate, committedLoad } from "./allocate.ts";

const now = () => new Date().toISOString();
export class HttpError extends Error { status: number; constructor(status: number, msg: string) { super(msg); this.status = status; } }

/** Opens the driver and serializes work on SQLite (passthrough on Postgres). */
async function run<T>(fn: (d: Db) => Promise<T>): Promise<T> {
  const d = await getDb();
  return d.exclusive(() => fn(d));
}

/** Per-owner write lock for the duration of a transaction (Postgres; SQLite is already serialized). */
async function lockOwner(d: Db, ownerId: string) {
  if (d.kind !== "postgres") return;
  await (d.orm as unknown as { execute: (q: unknown) => Promise<unknown> }).execute(sql`SELECT pg_advisory_xact_lock(hashtext(${ownerId}))`);
}

const first = <T>(rows: T[]): T | undefined => rows[0];

export function ensureOwner(ownerId: string): Promise<void> {
  return run(async (d) => {
    const t = d.t;
    if (first(await d.orm.select().from(t.owners).where(eq(t.owners.id, ownerId)).limit(1))) return;
    await d.tx(async (tx) => {
      await lockOwner(tx, ownerId);
      if (first(await tx.orm.select().from(t.owners).where(eq(t.owners.id, ownerId)).limit(1))) return;
      await tx.orm.insert(t.owners).values({ id: ownerId, createdAt: now() });
      for (const p of catalog) await tx.orm.insert(t.parts).values({ ownerId, partId: p.id, data: JSON.stringify(p) });
      await tx.orm.insert(t.assumptionVersions).values({ ownerId, version: 1, data: JSON.stringify(defaultAssumptions), createdAt: now() });
      await repack(tx, ownerId, defaultAssumptions);
    });
  });
}

export function getCatalog(ownerId: string): Promise<Part[]> {
  return run(async (d) => (await d.orm.select().from(d.t.parts).where(eq(d.t.parts.ownerId, ownerId)).orderBy(d.t.parts.rowId)).map((r) => JSON.parse(r.data) as Part));
}

export interface AssumptionsRow { version: number; values: Assumptions; createdAt: string }
async function getAssumptionsD(d: Db, ownerId: string, version?: number): Promise<AssumptionsRow> {
  const t = d.t;
  const q = d.orm.select().from(t.assumptionVersions);
  const r = first(version === undefined
    ? await q.where(eq(t.assumptionVersions.ownerId, ownerId)).orderBy(desc(t.assumptionVersions.version)).limit(1)
    : await q.where(and(eq(t.assumptionVersions.ownerId, ownerId), eq(t.assumptionVersions.version, version))).limit(1));
  if (!r) throw new HttpError(404, "assumptions not found");
  return { version: r.version, values: JSON.parse(r.data), createdAt: r.createdAt };
}
export function getAssumptions(ownerId: string, version?: number): Promise<AssumptionsRow> {
  return run((d) => getAssumptionsD(d, ownerId, version));
}
export function listAssumptionVersions(ownerId: string): Promise<AssumptionsRow[]> {
  return run(async (d) => (await d.orm.select().from(d.t.assumptionVersions).where(eq(d.t.assumptionVersions.ownerId, ownerId)).orderBy(desc(d.t.assumptionVersions.version)))
    .map((r) => ({ version: r.version, values: JSON.parse(r.data), createdAt: r.createdAt })));
}

export function saveAssumptions(ownerId: string, values: Assumptions): Promise<AssumptionsRow> {
  return run((d) => d.tx(async (tx) => {
    const t = tx.t;
    await lockOwner(tx, ownerId);
    const cur = first(await tx.orm.select({ v: max(t.assumptionVersions.version) }).from(t.assumptionVersions).where(eq(t.assumptionVersions.ownerId, ownerId)));
    const version = Number(cur?.v ?? 0) + 1;
    await tx.orm.insert(t.assumptionVersions).values({ ownerId, version, data: JSON.stringify(values), createdAt: now() });
    await repack(tx, ownerId, values);
    return { version, values, createdAt: now() };
  }));
}

async function activeOrders(d: Db, ownerId: string) {
  const t = d.t;
  return d.orm.select().from(t.quotes).where(and(eq(t.quotes.ownerId, ownerId), eq(t.quotes.status, "accepted"))).orderBy(t.quotes.acceptedSeq);
}

/** Rebuild persisted allocations for the owner: backlog first, then accepted orders in acceptance order. */
async function repack(d: Db, ownerId: string, a: Assumptions) {
  const t = d.t;
  const orders = (await activeOrders(d, ownerId)).map((o) => ({ id: o.id, hours: o.committedHours ?? 0 }));
  const alloc = allocate(a.backlogHours, a.capacityHours, orders);
  await d.orm.delete(t.allocations).where(eq(t.allocations.ownerId, ownerId));
  for (const sl of [...alloc.backlog, ...alloc.orders]) await d.orm.insert(t.allocations).values({ ownerId, orderId: sl.orderId, week: sl.week, hours: sl.hours });
}

async function currentLoadD(d: Db, ownerId: string, a?: Assumptions) {
  const as = a ?? (await getAssumptionsD(d, ownerId)).values;
  const orders = (await activeOrders(d, ownerId)).map((o) => ({ id: o.id, hours: o.committedHours ?? 0 }));
  return { backlog: as.backlogHours, committed: orders.reduce((x, o) => x + o.hours, 0), total: committedLoad(as.backlogHours, orders) };
}
export function currentLoad(ownerId: string, a?: Assumptions) {
  return run((d) => currentLoadD(d, ownerId, a));
}

/** Price a part against the owner's current assumptions and current committed load. */
async function priceNowD(d: Db, ownerId: string, part: Part) {
  const a = await getAssumptionsD(d, ownerId);
  const load = await currentLoadD(d, ownerId, a.values);
  const result = priceQuote(part, { ...a.values, backlogHours: load.total });
  return { result, assumptionsVersion: a.version, committedLoad: load.total };
}
export function priceNow(ownerId: string, part: Part) {
  return run((d) => priceNowD(d, ownerId, part));
}

export interface RevisionView { rev: number; assumptionsVersion: number; committedLoadAtPricing: number; part: Part; result: Quote; createdAt: string }
export interface QuoteView {
  id: string; number: number; status: string; createdAt: string; committedHours: number | null;
  latest: RevisionView; revisions: RevisionView[];
  current: { result: Quote; assumptionsVersion: number; committedLoad: number } | null; // live repricing for open quotes
  stale: boolean;
}

const revView = (r: typeof s.quoteRevisions.$inferSelect): RevisionView => ({
  rev: r.rev, assumptionsVersion: r.assumptionsVersion, committedLoadAtPricing: r.committedLoadAtPricing,
  part: JSON.parse(r.part), result: JSON.parse(r.result), createdAt: r.createdAt,
});

async function view(d: Db, ownerId: string, q: typeof s.quotes.$inferSelect): Promise<QuoteView> {
  const t = d.t;
  const revisions = (await d.orm.select().from(t.quoteRevisions).where(eq(t.quoteRevisions.quoteId, q.id)).orderBy(desc(t.quoteRevisions.rev))).map(revView);
  const latest = revisions[0];
  const live = q.status === "open" ? await priceNowD(d, ownerId, latest.part) : null;
  const curVer = (await getAssumptionsD(d, ownerId)).version;
  return { id: q.id, number: q.number, status: q.status, createdAt: q.createdAt, committedHours: q.committedHours, latest, revisions, current: live, stale: q.status === "open" && live !== null && (latest.assumptionsVersion !== curVer || latest.committedLoadAtPricing !== live.committedLoad) };
}

async function owned(d: Db, ownerId: string, id: string) {
  const t = d.t;
  const q = first(await d.orm.select().from(t.quotes).where(and(eq(t.quotes.id, id), eq(t.quotes.ownerId, ownerId))).limit(1));
  if (!q) throw new HttpError(404, "quote not found");
  return q;
}

export function getQuote(ownerId: string, id: string): Promise<QuoteView> {
  return run(async (d) => view(d, ownerId, await owned(d, ownerId, id)));
}
export function listQuotes(ownerId: string): Promise<QuoteView[]> {
  return run(async (d) => {
    const qs = await d.orm.select().from(d.t.quotes).where(eq(d.t.quotes.ownerId, ownerId)).orderBy(desc(d.t.quotes.number));
    const out: QuoteView[] = [];
    for (const q of qs) out.push(await view(d, ownerId, q));
    return out;
  });
}

async function addRevision(d: Db, ownerId: string, quoteId: string, rev: number, part: Part) {
  const p = await priceNowD(d, ownerId, part);
  await d.orm.insert(d.t.quoteRevisions).values({
    quoteId, rev, assumptionsVersion: p.assumptionsVersion, committedLoadAtPricing: p.committedLoad,
    part: JSON.stringify(part), result: JSON.stringify(p.result), createdAt: now(),
  });
}

export function createQuote(ownerId: string, part: Part): Promise<QuoteView> {
  const id = randomUUID();
  return run(async (d) => {
    await d.tx(async (tx) => {
      const t = tx.t;
      await lockOwner(tx, ownerId);
      const n = first(await tx.orm.select({ n: max(t.quotes.number) }).from(t.quotes).where(eq(t.quotes.ownerId, ownerId)));
      await tx.orm.insert(t.quotes).values({ id, ownerId, number: Number(n?.n ?? 0) + 1, status: "open", createdAt: now() });
      await addRevision(tx, ownerId, id, 1, part);
    });
    return view(d, ownerId, await owned(d, ownerId, id));
  });
}

export function reviseQuote(ownerId: string, id: string, part: Part): Promise<QuoteView> {
  return run(async (d) => {
    await d.tx(async (tx) => {
      const t = tx.t;
      await lockOwner(tx, ownerId);
      const q = await owned(tx, ownerId, id);
      if (q.status !== "open") throw new HttpError(409, `quote is ${q.status}; only open quotes can be revised`);
      const m = first(await tx.orm.select({ m: max(t.quoteRevisions.rev) }).from(t.quoteRevisions).where(eq(t.quoteRevisions.quoteId, id)));
      await addRevision(tx, ownerId, id, Number(m?.m ?? 0) + 1, part);
    });
    return view(d, ownerId, await owned(d, ownerId, id));
  });
}

export function acceptQuote(ownerId: string, id: string): Promise<QuoteView> {
  return run(async (d) => {
    await d.tx(async (tx) => {
      const t = tx.t;
      // Everything below (revalidation + status flip) runs in one transaction holding the owner lock.
      await lockOwner(tx, ownerId);
      const q = first(await tx.orm.select().from(t.quotes).where(and(eq(t.quotes.id, id), eq(t.quotes.ownerId, ownerId))).limit(1));
      if (!q) throw new HttpError(404, "quote not found");
      if (q.status !== "open") throw new HttpError(409, `quote is ${q.status}`);
      const latest = first(await tx.orm.select().from(t.quoteRevisions).where(eq(t.quoteRevisions.quoteId, id)).orderBy(desc(t.quoteRevisions.rev)).limit(1))!;
      const ver = first(await tx.orm.select().from(t.assumptionVersions).where(eq(t.assumptionVersions.ownerId, ownerId)).orderBy(desc(t.assumptionVersions.version)).limit(1))!;
      const a = JSON.parse(ver.data) as Assumptions;
      if (latest.assumptionsVersion !== ver.version) throw new HttpError(409, "quote was priced under older assumptions; re-save it as a new revision first");
      const orders = (await activeOrders(tx, ownerId)).map((o) => ({ id: o.id, hours: o.committedHours ?? 0 }));
      const load = committedLoad(a.backlogHours, orders);
      if (Math.abs(latest.committedLoadAtPricing - load) > 1e-6) {
        throw new HttpError(409, `committed load changed since this quote was priced (${latest.committedLoadAtPricing} h then, ${load} h now); re-save it as a new revision reflecting current lead time before acceptance`);
      }
      const hours = (JSON.parse(latest.result) as Quote).hoursNeeded;
      const seq = first(await tx.orm.select({ m: max(t.quotes.acceptedSeq) }).from(t.quotes).where(eq(t.quotes.ownerId, ownerId)));
      const res = await tx.orm.update(t.quotes).set({ status: "accepted", acceptedSeq: Number(seq?.m ?? 0) + 1, committedHours: hours })
        .where(and(eq(t.quotes.id, id), eq(t.quotes.ownerId, ownerId), eq(t.quotes.status, "open"))).returning({ id: t.quotes.id });
      if (res.length !== 1) throw new HttpError(409, "quote is no longer open");
      await repack(tx, ownerId, a);
    });
    return view(d, ownerId, await owned(d, ownerId, id));
  });
}

/** Open -> rejected. Accepted -> cancelled (frees committed hours; later orders shift earlier). */
export function closeQuote(ownerId: string, id: string, kind: "cancel" | "reject"): Promise<QuoteView> {
  return run(async (d) => {
    await d.tx(async (tx) => {
      const t = tx.t;
      await lockOwner(tx, ownerId);
      const q = await owned(tx, ownerId, id);
      const to = q.status === "open" ? "rejected" : q.status === "accepted" ? "cancelled" : null;
      if (!to) throw new HttpError(409, `quote is already ${q.status}`);
      if (kind === "reject" && q.status !== "open") throw new HttpError(409, "only open quotes can be rejected; cancel an accepted order instead");
      await tx.orm.update(t.quotes).set({ status: to }).where(eq(t.quotes.id, id));
      await repack(tx, ownerId, (await getAssumptionsD(tx, ownerId)).values);
    });
    return view(d, ownerId, await owned(d, ownerId, id));
  });
}

export interface WeekView { week: number; start: string; capacity: number; committed: number; backlog: number; available: number; orders: { id: string; number: number; part: string; hours: number }[] }
export function getCapacity(ownerId: string, weeks = 8) {
  return run((d) => getCapacityD(d, ownerId, weeks));
}
async function getCapacityD(d: Db, ownerId: string, weeks: number) {
  const t = d.t;
  const a = (await getAssumptionsD(d, ownerId)).values;
  const rows = await d.orm.select().from(t.allocations).where(eq(t.allocations.ownerId, ownerId));
  const ids = [...new Set(rows.map((r) => r.orderId).filter((x) => x !== "BACKLOG"))];
  const qs = ids.length ? await d.orm.select().from(t.quotes).where(inArray(t.quotes.id, ids)) : [];
  const names = new Map<string, { number: number; part: string }>();
  for (const q of qs) {
    const rev = first(await d.orm.select().from(t.quoteRevisions).where(eq(t.quoteRevisions.quoteId, q.id)).orderBy(desc(t.quoteRevisions.rev)).limit(1))!;
    names.set(q.id, { number: q.number, part: (JSON.parse(rev.part) as Part).name });
  }
  const last = Math.max(weeks - 1, ...rows.map((r) => r.week));
  const monday = new Date();
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const out: WeekView[] = [];
  for (let w = 0; w <= last; w++) {
    const wr = rows.filter((r) => r.week === w);
    const backlog = wr.filter((r) => r.orderId === "BACKLOG").reduce((x, r) => x + r.hours, 0);
    const ords = wr.filter((r) => r.orderId !== "BACKLOG").map((r) => ({ id: r.orderId, number: names.get(r.orderId)?.number ?? 0, part: names.get(r.orderId)?.part ?? "", hours: r.hours }));
    const committed = ords.reduce((x, o) => x + o.hours, 0);
    const d = new Date(monday); d.setUTCDate(d.getUTCDate() + 7 * w);
    out.push({ week: w, start: d.toISOString().slice(0, 10), capacity: a.capacityHours, backlog: Math.round(backlog * 100) / 100, committed: Math.round(committed * 100) / 100, available: Math.max(0, Math.round((a.capacityHours - backlog - committed) * 100) / 100), orders: ords });
  }
  return { weeks: out, load: await currentLoadD(d, ownerId, a), capacityHours: a.capacityHours };
}
