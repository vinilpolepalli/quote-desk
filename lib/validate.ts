import type { Assumptions, MaterialId, Part, Tol } from "./data.ts";
import { materials } from "./data.ts";

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function num(v: unknown, name: string, min: number, max: number, int = false): number | string {
  if (typeof v !== "number" || !Number.isFinite(v)) return `${name} must be a number`;
  if (v < min || v > max) return `${name} must be between ${min} and ${max}`;
  if (int && !Number.isInteger(v)) return `${name} must be an integer`;
  return v;
}

export function parsePart(raw: unknown): Result<Part> {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "part must be an object" };
  const r = raw as Record<string, unknown>;
  if (typeof r.material !== "string" || !(r.material in materials)) return { ok: false, error: "unknown material" };
  if (r.tol !== "STD" && r.tol !== "PRECISION" && r.tol !== "ULTRA") return { ok: false, error: "tol must be STD, PRECISION or ULTRA" };
  const name = typeof r.name === "string" && r.name.trim() ? r.name.trim().slice(0, 80) : "Custom part";
  const id = typeof r.id === "string" && r.id.trim() ? r.id.trim().slice(0, 40) : "CUSTOM";
  if (!Array.isArray(r.stock) || r.stock.length !== 3) return { ok: false, error: "stock must be [L, W, H] in mm" };
  const stock: number[] = [];
  for (const [i, d] of r.stock.entries()) {
    const v = num(d, `stock[${i}]`, 0.01, 10000);
    if (typeof v === "string") return { ok: false, error: v };
    stock.push(v);
  }
  const checks: [string, number, number, boolean][] = [
    ["pockets", 0, 1000, true], ["holes", 0, 1000, true], ["tightBores", 0, 100, true], ["setups", 1, 20, true], ["qty", 1, 100000, true],
  ];
  const out: Record<string, number> = {};
  for (const [k, lo, hi, int] of checks) {
    const v = num(r[k], k, lo, hi, int);
    if (typeof v === "string") return { ok: false, error: v };
    out[k] = v;
  }
  let thinWallMm: number | null = null;
  if (r.thinWallMm !== null && r.thinWallMm !== undefined) {
    const v = num(r.thinWallMm, "thinWallMm", 0.01, 10000);
    if (typeof v === "string") return { ok: false, error: v };
    thinWallMm = v;
  }
  return { ok: true, value: { id, name, material: r.material as MaterialId, stock: stock as [number, number, number], pockets: out.pockets, holes: out.holes, tightBores: out.tightBores, setups: out.setups, thinWallMm, tol: r.tol as Tol, qty: out.qty } };
}

const ASSUMPTION_RANGES: Record<keyof Assumptions, [number, number]> = {
  rate3ax: [0, 10000], rate5ax: [0, 10000], rateGrind: [0, 10000], rateCmm: [0, 10000], setupRate: [0, 10000],
  setupHours: [0, 10000], capacityHours: [1, 10000], backlogHours: [0, 100000], markupPct: [0, 1000],
};

export function parseAssumptions(raw: unknown): Result<Assumptions> {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "assumptions must be an object" };
  const r = raw as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const [k, [lo, hi]] of Object.entries(ASSUMPTION_RANGES)) {
    const v = num(r[k], k, lo, hi);
    if (typeof v === "string") return { ok: false, error: v };
    out[k] = v;
  }
  return { ok: true, value: out as unknown as Assumptions };
}
