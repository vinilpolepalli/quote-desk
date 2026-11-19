import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog, defaultAssumptions } from "./data.ts";
import { quote } from "./engine.ts";
import { allocate } from "./allocate.ts";
import { parsePart, parseAssumptions } from "./validate.ts";

const by = (id: string) => catalog.find((p) => p.id === id)!;

test("deterministic", () => {
  assert.deepEqual(quote(by("BRK-100"), defaultAssumptions), quote(by("BRK-100"), defaultAssumptions));
});
test("simple bracket is QUOTE OK", () => {
  assert.equal(quote(by("BRK-100"), defaultAssumptions).flag, "QUOTE OK");
});
test("ultra tolerance needs review", () => {
  const q = quote(by("HSG-330"), { ...defaultAssumptions, backlogHours: 0, capacityHours: 10000 });
  assert.equal(q.flag, "REVIEW PROCESS");
});
test("high backlog is capacity tight", () => {
  assert.equal(quote(by("BRK-100"), { ...defaultAssumptions, backlogHours: 200 }).flag, "CAPACITY TIGHT");
});
test("total is sum of parts", () => {
  const q = quote(by("FTG-305"), defaultAssumptions);
  assert.ok(Math.abs(q.total - (q.material + q.setup + q.machine + q.inspection)) < 0.05);
});
test("more setups raises setup cost and hours", () => {
  const p = by("BRK-100");
  const a = quote(p, defaultAssumptions), b = quote({ ...p, setups: p.setups + 1 }, defaultAssumptions);
  assert.ok(b.setup > a.setup && b.hoursNeeded > a.hoursNeeded);
});
test("BRK-100 hand-checked breakdown", () => {
  // cycle = (3*6 + 8*1.5 + 2*3) * 1.0 = 36 min; machine = 36*50/60 = 30 h * $85 = 2550
  // setup = 2*1.5*90 = 270; cmm = 2 min*50/60 = 1.6667 h * 95 = 158.33
  // material = 120*80*25*2.7e-6 = 0.648 kg * 6 * 50 = 194.4
  const q = quote(by("BRK-100"), defaultAssumptions);
  assert.equal(q.cycleMinPerPart, 36);
  assert.equal(q.machine, 2550);
  assert.equal(q.setup, 270);
  assert.equal(q.inspection, 158.33);
  assert.equal(q.material, 194.4);
  assert.equal(q.hoursNeeded, 34.67);
});
test("lead time grows with committed load", () => {
  const p = by("BRK-100");
  const a = quote(p, { ...defaultAssumptions, backlogHours: 0 }), b = quote(p, { ...defaultAssumptions, backlogHours: 120 });
  assert.equal(b.leadWeeks, a.leadWeeks + 1);
});
test("allocate fills weeks sequentially after backlog", () => {
  const r = allocate(45, 120, [{ id: "a", hours: 100 }, { id: "b", hours: 30 }]);
  assert.deepEqual(r.backlog, [{ orderId: "BACKLOG", week: 0, hours: 45 }]);
  assert.deepEqual(r.orders, [
    { orderId: "a", week: 0, hours: 75 }, { orderId: "a", week: 1, hours: 25 }, { orderId: "b", week: 1, hours: 30 },
  ]);
});
test("allocate with zero orders", () => {
  assert.deepEqual(allocate(0, 120, []), { backlog: [], orders: [] });
});
test("validation bounds", () => {
  const ok = { ...by("BRK-100") };
  assert.equal(parsePart(ok).ok, true);
  assert.equal(parsePart({ ...ok, qty: 100001 }).ok, false);
  assert.equal(parsePart({ ...ok, qty: 0 }).ok, false);
  assert.equal(parsePart({ ...ok, stock: [10001, 1, 1] }).ok, false);
  assert.equal(parsePart({ ...ok, material: "gold" }).ok, false);
  assert.equal(parseAssumptions({ ...defaultAssumptions, rate3ax: 10001 }).ok, false);
  assert.equal(parseAssumptions({ ...defaultAssumptions, capacityHours: 0 }).ok, false);
  assert.equal(parseAssumptions(defaultAssumptions).ok, true);
});

test("material formula is split into mass (kg/pc) and cost lines", () => {
  const q = quote(by("BRK-100"), defaultAssumptions);
  const mass = q.lines.find((l) => l.key === "mass")!;
  const mat = q.lines.find((l) => l.key === "material")!;
  assert.equal(mass.label, "Mass per piece");
  assert.equal(mass.formula, "120 x 80 x 25 mm x 0.0000027 kg/mm3 = 0.65 kg/pc");
  assert.equal(mat.label, "Material cost");
  assert.equal(mat.formula, "0.65 kg/pc x 50 pcs x $6/kg = $194.4");
});
