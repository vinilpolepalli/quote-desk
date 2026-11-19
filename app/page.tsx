import Link from "next/link";
import { pageOwner } from "@/lib/owner";
import { getCapacity, listQuotes } from "@/lib/store";
import { CapacityStrip, CapacityLegend, Chip } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Desk() {
  const o = await pageOwner();
  const cap = await getCapacity(o);
  const qs = await listQuotes(o);
  const open = qs.filter((q) => q.status === "open");
  const orders = qs.filter((q) => q.status === "accepted");
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div><p className="label">The desk</p><h1 className="text-2xl font-semibold tracking-tight">Open quotes</h1></div>
        <Link href="/quotes/new" className="btn btn-primary">New quote</Link>
      </div>
      <section className="card">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="label">Capacity - next 8 weeks</p>
          <p className="mono text-xs text-mute">{cap.load.total}h load ahead (backlog {cap.load.backlog} + orders {cap.load.committed}) / {cap.capacityHours}h per week</p>
        </div>
        <CapacityStrip weeks={cap.weeks} />
        <CapacityLegend />
      </section>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="card">
          <p className="label mb-2">Open quotes ({open.length})</p>
          {open.length === 0 && <p className="text-sm text-mute">No open quotes. <Link className="text-accent underline" href="/quotes/new">Start one</Link>.</p>}
          <ul className="divide-y divide-hair">
            {open.map((q) => {
              const r = (q.current ?? { result: q.latest.result }).result;
              return (
                <li key={q.id}><Link href={`/quotes/${q.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-accent">
                  <span className="min-w-0"><span className="mono text-xs text-mute">Q-{String(q.number).padStart(4, "0")} r{q.latest.rev}</span>
                    <span className="block truncate font-medium">{q.latest.part.name} x {q.latest.part.qty}</span>
                    {q.stale && <span className="text-xs text-mute">assumptions changed - reprice</span>}</span>
                  <span className="text-right"><span className="mono block text-sm">${r.total.toLocaleString("en-US")}</span><span className="mono block text-xs text-mute">{r.leadWeeks} wk lead</span><Chip flag={r.flag} /></span>
                </Link></li>
              );
            })}
          </ul>
        </section>
        <section className="card">
          <p className="label mb-2">Order book ({orders.length})</p>
          {orders.length === 0 && <p className="text-sm text-mute">Nothing committed. Accept a quote to reserve machine-hours.</p>}
          <ul className="divide-y divide-hair text-sm">
            {orders.map((q) => (
              <li key={q.id}><Link href={`/quotes/${q.id}`} className="flex justify-between gap-2 py-2 hover:text-accent">
                <span className="truncate">Q-{String(q.number).padStart(4, "0")} {q.latest.part.name}</span><span className="mono">{q.committedHours}h</span></Link></li>
            ))}
          </ul>
          <Link href="/capacity" className="mt-3 inline-block text-sm text-accent underline">Week-by-week view</Link>
        </section>
      </div>
      <p className="text-xs text-mute">All rates, the catalog and the starting backlog are invented SAMPLE values. Flags are plain arithmetic, shown per line on each quote.</p>
    </div>
  );
}
