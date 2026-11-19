import Link from "next/link";
import { pageOwner } from "@/lib/owner";
import { getCapacity } from "@/lib/store";
import { CapacityStrip, CapacityLegend } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Capacity() {
  const o = await pageOwner();
  const cap = await getCapacity(o, 12);
  return (
    <div className="space-y-5">
      <div><p className="label">Order book</p><h1 className="text-2xl font-semibold tracking-tight">Capacity &amp; committed orders</h1>
        <p className="mt-1 max-w-2xl text-sm text-mute">Weekly capacity is {cap.capacityHours} machine-hours (SAMPLE). The starting backlog fills first; accepted orders then fill later hours in acceptance order. Cancelling an order frees its hours and later orders move up.</p></div>
      <section className="card"><CapacityStrip weeks={cap.weeks} weeksShown={12} /><CapacityLegend /></section>
      <section className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead><tr className="text-left"><th className="label py-2">Week of</th><th className="label text-right">Capacity</th><th className="label text-right">Backlog</th><th className="label text-right">Committed</th><th className="label text-right">Available</th><th className="label pl-4">Orders consuming hours</th></tr></thead>
          <tbody className="divide-y divide-hair">
            {cap.weeks.map((w) => (
              <tr key={w.week} className="align-top">
                <td className="mono py-2">{w.start}</td><td className="mono text-right">{w.capacity}</td><td className="mono text-right">{w.backlog}</td>
                <td className="mono text-right">{w.committed}</td><td className="mono text-right font-semibold">{w.available}</td>
                <td className="pl-4">{w.orders.length === 0 ? <span className="text-mute">-</span> : w.orders.map((x) => (
                  <Link key={x.id} href={`/quotes/${x.id}`} className="mr-3 inline-block text-accent underline">Q-{String(x.number).padStart(4, "0")} {x.part} <span className="mono">{x.hours}h</span></Link>))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
