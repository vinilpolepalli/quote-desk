export type Tol = "STD" | "PRECISION" | "ULTRA";
export type MaterialId = "al6061" | "al7075" | "ti64" | "ss174";

export interface Material { id: MaterialId; name: string; costPerKg: number; density: number; machinability: number }
export interface Part {
  id: string; name: string; material: MaterialId;
  stock: [number, number, number]; // mm
  pockets: number; holes: number; tightBores: number; setups: number;
  thinWallMm: number | null; tol: Tol; qty: number;
}
export interface Assumptions {
  rate3ax: number; rate5ax: number; rateGrind: number; rateCmm: number; setupRate: number;
  setupHours: number; capacityHours: number; backlogHours: number; markupPct: number;
}

// All values below are invented sample data.
export const materials: Record<MaterialId, Material> = {
  al6061: { id: "al6061", name: "Aluminum 6061-T6", costPerKg: 6, density: 2.7e-6, machinability: 1.0 },
  al7075: { id: "al7075", name: "Aluminum 7075-T6", costPerKg: 9, density: 2.81e-6, machinability: 1.2 },
  ss174: { id: "ss174", name: "Stainless 17-4PH", costPerKg: 14, density: 7.8e-6, machinability: 2.2 },
  ti64: { id: "ti64", name: "Titanium Ti-6Al-4V", costPerKg: 55, density: 4.43e-6, machinability: 3.4 },
};

export const catalog: Part[] = [
  { id: "BRK-100", name: "Mounting Bracket", material: "al6061", stock: [120, 80, 25], pockets: 3, holes: 8, tightBores: 0, setups: 2, thinWallMm: 2.5, tol: "STD", qty: 50 },
  { id: "HSG-210", name: "Sensor Housing", material: "al7075", stock: [100, 100, 60], pockets: 5, holes: 6, tightBores: 1, setups: 3, thinWallMm: 1.2, tol: "PRECISION", qty: 25 },
  { id: "FTG-305", name: "Hydraulic Fitting", material: "ss174", stock: [60, 60, 90], pockets: 0, holes: 4, tightBores: 2, setups: 2, thinWallMm: null, tol: "PRECISION", qty: 40 },
  { id: "BRK-120", name: "Gusset Bracket", material: "ti64", stock: [150, 90, 20], pockets: 4, holes: 10, tightBores: 0, setups: 2, thinWallMm: 2.0, tol: "STD", qty: 20 },
  { id: "HSG-330", name: "Actuator Housing", material: "ti64", stock: [140, 140, 100], pockets: 7, holes: 12, tightBores: 3, setups: 4, thinWallMm: 1.8, tol: "ULTRA", qty: 10 },
  { id: "FTG-410", name: "Manifold Block", material: "al7075", stock: [160, 100, 50], pockets: 2, holes: 18, tightBores: 1, setups: 3, thinWallMm: null, tol: "STD", qty: 100 },
];

export const defaultAssumptions: Assumptions = {
  rate3ax: 85, rate5ax: 140, rateGrind: 110, rateCmm: 95, setupRate: 90,
  setupHours: 1.5, capacityHours: 120, backlogHours: 45, markupPct: 0,
};
