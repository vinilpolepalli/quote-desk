import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qd-test-"));
process.env.QD_DB_PATH = path.join(dir, "test.db");
const store = await import("./store.ts");
const { catalog, defaultAssumptions } = await import("./data.ts");

let n = 0;
async function setup() {
  const owner = `owner-${++n}`;
  await store.ensureOwner(owner);
  return owner;
}
const part = catalog[0];
const status = async (fn: () => Promise<unknown>) => { try { await fn(); return 200; } catch (e) { return (e as { status?: number }).status ?? 500; } };

test("accept succeeds on a fresh quote", async () => {
  const o = await setup();
  const q = await store.createQuote(o, part);
  assert.equal((await store.acceptQuote(o, q.id)).status, "accepted");
});

test("(a) accept after another quote was accepted -> 409 until re-saved", async () => {
  const o = await setup();
  const q1 = await store.createQuote(o, part);
  const q2 = await store.createQuote(o, part);
  await store.acceptQuote(o, q1.id);
  assert.equal(await status(() => store.acceptQuote(o, q2.id)), 409);
  assert.equal((await store.getQuote(o, q2.id)).status, "open");
  await store.reviseQuote(o, q2.id, part);
  assert.equal((await store.acceptQuote(o, q2.id)).status, "accepted");
});

test("(b) double accept -> second is 409", async () => {
  const o = await setup();
  const q = await store.createQuote(o, part);
  assert.equal(await status(() => store.acceptQuote(o, q.id)), 200);
  assert.equal(await status(() => store.acceptQuote(o, q.id)), 409);
  assert.equal((await store.currentLoad(o)).committed, (await store.getQuote(o, q.id)).committedHours);
});

test("(c) accept after assumptions change -> 409", async () => {
  const o = await setup();
  const q = await store.createQuote(o, part);
  await store.saveAssumptions(o, { ...defaultAssumptions, markupPct: defaultAssumptions.markupPct + 1 });
  assert.equal(await status(() => store.acceptQuote(o, q.id)), 409);
  assert.equal((await store.getQuote(o, q.id)).status, "open");
});
