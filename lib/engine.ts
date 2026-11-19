import type { Assumptions, Material, Part, Tol } from "./data.ts";
import { materials } from "./data.ts";

export type Flag = "QUOTE OK" | "REVIEW PROCESS" | "CAPACITY TIGHT";

export interface Quote {
  cycleMinPerPart: number; grindMinPerPart: number; cmmMinPerPart: number;
  material: number; setup: number; machine: number; inspection: number;
  total: number; perUnit: number;
  hoursNeeded: number; loadRatio: number; leadWeeks: number; leadDays: number;
  flag: Flag; reasons: string[];
  lines: Line[];
}
export interface Line { key: string; label: string; formula: string; value: string }

export const TIGHT_RATIO = 0.85;
export const THIN_WALL_MM = 1.5;
const CMM_MIN: Record<Tol, number> = { STD: 2, PRECISION: 8, ULTRA: 20 };
const GRIND_MIN_PER_BORE: Record<Tol, number> = { STD: 0, PRECISION: 6, ULTRA: 12 };
const FINISH_DAYS = 3;

const r2 = (n: number) => Math.round(n * 100) / 100;

export function quote(p: Part, a: Assumptions, mat: Material = materials[p.material]): Quote {
  const [l, w, h] = p.stock;
  const kg = l * w * h * mat.density;
  const material = kg * mat.costPerKg * p.qty;

  const baseMin = (p.pockets * 6 + p.holes * 1.5 + p.setups * 3) * mat.machinability;
  const thinPenalty = p.thinWallMm !== null && p.thinWallMm < THIN_WALL_MM ? 1.25 : 1;
  const cycleMinPerPart = baseMin * thinPenalty;
  const grindMinPerPart = p.tightBores * GRIND_MIN_PER_BORE[p.tol];
  const cmmMinPerPart = CMM_MIN[p.tol] + p.tightBores * 2;

  const rate = p.tol === "ULTRA" || p.pockets >= 5 ? a.rate5ax : a.rate3ax;
  const setupHrs = p.setups * a.setupHours;
  const machineHrs = (cycleMinPerPart * p.qty) / 60;
  const grindHrs = (grindMinPerPart * p.qty) / 60;
  const cmmHrs = (cmmMinPerPart * p.qty) / 60;

  const setup = setupHrs * a.setupRate;
  const machine = machineHrs * rate + grindHrs * a.rateGrind;
  const inspection = cmmHrs * a.rateCmm;
  const total = (material + setup + machine + inspection) * (1 + a.markupPct / 100);

  const hoursNeeded = setupHrs + machineHrs + grindHrs + cmmHrs;
  const loadRatio = (a.backlogHours + hoursNeeded) / a.capacityHours;
  const leadDays = Math.ceil(loadRatio * 5) + FINISH_DAYS; // 5 working days/week
  const leadWeeks = Math.max(1, Math.ceil(loadRatio));

  const reasons: string[] = [];
  if (loadRatio > TIGHT_RATIO) reasons.push(`Backlog + this lot = ${Math.round(loadRatio * 100)}% of weekly machine-hours (limit ${TIGHT_RATIO * 100}%).`);
  if (p.tol === "ULTRA") reasons.push("ULTRA tolerance: grinding + extended CMM time required.");
  if (p.tightBores > 0 && p.tol !== "STD") reasons.push(`${p.tightBores} tight bore(s): grinding + CMM added.`);
  if (p.thinWallMm !== null && p.thinWallMm < THIN_WALL_MM) reasons.push(`Thin wall ${p.thinWallMm} mm (< ${THIN_WALL_MM} mm): chatter risk, +25% cycle.`);

  let flag: Flag = "QUOTE OK";
  if (loadRatio > TIGHT_RATIO) flag = "CAPACITY TIGHT";
  else if (reasons.length) flag = "REVIEW PROCESS";
  if (!reasons.length) reasons.push("No rule triggered.");

  const f = (n: number) => String(r2(n));
  const lines: Line[] = [
    { key: "mass", label: "Mass per piece", formula: `${l} x ${w} x ${h} mm x ${mat.density} kg/mm3 = ${f(kg)} kg/pc`, value: `${f(kg)} kg/pc` },
    { key: "material", label: "Material cost", formula: `${f(kg)} kg/pc x ${p.qty} pcs x $${mat.costPerKg}/kg = $${f(material)}`, value: `$${f(material)}` },
    { key: "cycle", label: "Cycle time / part", formula: `(${p.pockets} pockets x 6 + ${p.holes} holes x 1.5 + ${p.setups} setups x 3) x ${mat.machinability} machinability${thinPenalty > 1 ? " x 1.25 thin wall" : ""}`, value: `${f(cycleMinPerPart)} min` },
    { key: "grind", label: "Grind / part", formula: `${p.tightBores} tight bores x ${GRIND_MIN_PER_BORE[p.tol]} min (${p.tol})`, value: `${grindMinPerPart} min` },
    { key: "cmm", label: "CMM / part", formula: `${CMM_MIN[p.tol]} min (${p.tol}) + ${p.tightBores} bores x 2`, value: `${cmmMinPerPart} min` },
    { key: "setup", label: "Setup", formula: `${p.setups} setups x ${a.setupHours} h x $${a.setupRate}/h (once per lot) = ${f(setupHrs)} h`, value: `$${f(setup)}` },
    { key: "machine", label: "Machine", formula: `${f(machineHrs)} h x $${rate}/h (${rate === a.rate5ax ? "5-axis" : "3-axis"}) + ${f(grindHrs)} h grind x $${a.rateGrind}/h`, value: `$${f(machine)}` },
    { key: "inspection", label: "Inspection", formula: `${f(cmmHrs)} h CMM x $${a.rateCmm}/h`, value: `$${f(inspection)}` },
    { key: "total", label: "Total", formula: `(${f(material)} + ${f(setup)} + ${f(machine)} + ${f(inspection)}) x (1 + ${a.markupPct}% markup)`, value: `$${f(total)}` },
    { key: "hours", label: "Machine-hours needed", formula: `${f(setupHrs)} setup + ${f(machineHrs)} machine + ${f(grindHrs)} grind + ${f(cmmHrs)} CMM`, value: `${f(hoursNeeded)} h` },
    { key: "lead", label: "Lead time", formula: `(${a.backlogHours} h committed load + ${f(hoursNeeded)} h) / ${a.capacityHours} h per week = ${f(loadRatio)} -> ceil = ${leadWeeks} wk; days = ceil(${f(loadRatio)} x 5) + ${FINISH_DAYS} finishing`, value: `${leadWeeks} wk / ${leadDays} d` },
  ];

  return {
    lines, cycleMinPerPart: r2(cycleMinPerPart), grindMinPerPart, cmmMinPerPart,
    material: r2(material), setup: r2(setup), machine: r2(machine), inspection: r2(inspection),
    total: r2(total), perUnit: r2(total / p.qty),
    hoursNeeded: r2(hoursNeeded), loadRatio: r2(loadRatio), leadWeeks, leadDays, flag, reasons,
  };
}
