"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Assumptions } from "@/lib/data";

const FIELDS: [keyof Assumptions, string, string][] = [
  ["rate3ax", "3-axis rate", "$/h"], ["rate5ax", "5-axis rate", "$/h"], ["rateGrind", "Grinder rate", "$/h"], ["rateCmm", "CMM rate", "$/h"],
  ["setupRate", "Setup rate", "$/h"], ["setupHours", "Hours per setup", "h"], ["capacityHours", "Machine-hours / week", "h"],
  ["backlogHours", "Starting backlog (SAMPLE)", "h"], ["markupPct", "Markup", "%"],
];

export default function AssumptionsForm({ initial }: { initial: Assumptions }) {
  const [v, setV] = useState<Record<string, string>>(Object.fromEntries(Object.entries(initial).map(([k, x]) => [k, String(x)])));
  const [msg, setMsg] = useState("");
  const router = useRouter();
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x.trim() === "" ? NaN : Number(x)]));
    const r = await fetch("/api/assumptions", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    setMsg(r.ok ? `Saved as version ${j.version}.` : j.error);
    if (r.ok) router.refresh();
  }
  return (
    <form onSubmit={save} className="card space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {FIELDS.map(([k, l, u]) => (
          <label key={k} className="block"><span className="label">{l} ({u})</span>
            <input inputMode="decimal" className="mono mt-1" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></label>
        ))}
      </div>
      <div className="flex items-center gap-3"><button className="btn btn-primary">Save new version</button><span role="status" className="text-sm text-mute">{msg}</span></div>
    </form>
  );
}
