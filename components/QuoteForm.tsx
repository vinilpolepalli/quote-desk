"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Part } from "@/lib/data";
import type { Quote } from "@/lib/engine";
import QuoteSheet from "./QuoteSheet";

const MATERIALS: [string, string][] = [["al6061", "Aluminum 6061-T6"], ["al7075", "Aluminum 7075-T6"], ["ss174", "Stainless 17-4PH"], ["ti64", "Titanium Ti-6Al-4V"]];
type F = { name: string; material: string; l: string; w: string; h: string; pockets: string; holes: string; tightBores: string; setups: string; thin: string; tol: string; qty: string };
const fromPart = (p: Part): F => ({ name: p.name, material: p.material, l: String(p.stock[0]), w: String(p.stock[1]), h: String(p.stock[2]), pockets: String(p.pockets), holes: String(p.holes), tightBores: String(p.tightBores), setups: String(p.setups), thin: p.thinWallMm === null ? "" : String(p.thinWallMm), tol: p.tol, qty: String(p.qty) });
const toPart = (f: F, id: string) => ({ id, name: f.name || "Custom part", material: f.material, stock: [Number(f.l), Number(f.w), Number(f.h)], pockets: Number(f.pockets), holes: Number(f.holes), tightBores: Number(f.tightBores), setups: Number(f.setups), thinWallMm: f.thin.trim() === "" ? null : Number(f.thin), tol: f.tol, qty: Number(f.qty) });

export default function QuoteForm({ catalog, initial, quoteId, partId }: { catalog: Part[]; initial?: Part; quoteId?: string; partId?: string }) {
  const [pid, setPid] = useState(partId ?? initial?.id ?? catalog[0].id);
  const [f, setF] = useState<F>(fromPart(initial ?? catalog[0]));
  const [prev, setPrev] = useState<{ result: Quote; assumptionsVersion: number; committedLoad: number } | null>(null);
  const [err, setErr] = useState("");
  const router = useRouter();
  const set = (k: keyof F) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setF({ ...f, [k]: e.target.value }); setPid("CUSTOM"); };

  useEffect(() => {
    const t = setTimeout(async () => {
      const r = await fetch("/api/quotes/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(toPart(f, pid)) });
      const j = await r.json();
      if (r.ok) { setPrev(j); setErr(""); } else setErr(j.error);
    }, 250);
    return () => clearTimeout(t);
  }, [f, pid]);

  function pick(id: string) {
    const p = catalog.find((c) => c.id === id);
    if (p) { setF(fromPart(p)); setPid(p.id); } else setPid("CUSTOM");
  }
  async function save() {
    const r = await fetch(quoteId ? `/api/quotes/${quoteId}` : "/api/quotes", { method: quoteId ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(toPart(f, pid)) });
    const j = await r.json();
    if (!r.ok) return setErr(j.error);
    router.push(`/quotes/${j.id}`); router.refresh();
  }
  const num = (k: keyof F, label: string, unit = "") => (
    <label className="block"><span className="label">{label}{unit && ` (${unit})`}</span><input inputMode="decimal" className="mono mt-1" value={f[k]} onChange={set(k)} /></label>
  );
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="card space-y-4">
        <label className="block"><span className="label">Catalog part (SAMPLE)</span>
          <select className="mt-1" value={catalog.some((c) => c.id === pid) ? pid : "CUSTOM"} onChange={(e) => pick(e.target.value)}>
            {catalog.map((c) => <option key={c.id} value={c.id}>{c.id} - {c.name}</option>)}<option value="CUSTOM">Custom part</option></select></label>
        <label className="block"><span className="label">Name</span><input className="mt-1" value={f.name} onChange={set("name")} maxLength={80} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="label">Material</span><select className="mt-1" value={f.material} onChange={set("material")}>{MATERIALS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
          <label className="block"><span className="label">Tolerance class</span><select className="mt-1" value={f.tol} onChange={set("tol")}><option>STD</option><option>PRECISION</option><option>ULTRA</option></select></label>
        </div>
        <div className="grid grid-cols-3 gap-3">{num("l", "L", "mm")}{num("w", "W", "mm")}{num("h", "H", "mm")}</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{num("pockets", "Pockets")}{num("holes", "Holes")}{num("tightBores", "Tight bores")}{num("setups", "Setups")}{num("thin", "Thin wall", "mm, blank=none")}{num("qty", "Quantity")}</div>
        {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
        <button onClick={save} className="btn btn-primary w-full">{quoteId ? "Save as new revision" : "Save quote"}</button>
      </div>
      <div className="card">
        <p className="label mb-2">Live preview</p>
        {prev ? <QuoteSheet r={prev.result} note={`Priced at assumptions v${prev.assumptionsVersion}, ${prev.committedLoad} h load ahead`} /> : <p className="text-sm text-mute">{err || "Pricing..."}</p>}
      </div>
    </div>
  );
}
