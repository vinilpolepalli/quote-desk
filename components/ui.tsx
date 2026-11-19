import Link from "next/link";
import type { WeekView } from "@/lib/store";

export function Chip({ flag }: { flag: string }) {
  const cls = flag === "QUOTE OK" ? "border-accent text-accent" : flag === "REVIEW PROCESS" ? "border-ink text-ink" : "border-red-700 bg-red-700 text-white";
  return <span className={`pill ${cls}`}>{flag}</span>;
}
export function Status({ s }: { s: string }) {
  const cls = s === "accepted" ? "border-accent bg-accent text-white" : s === "open" ? "border-hair text-ink" : "border-hair text-mute";
  return <span className={`pill ${cls}`}>{s}</span>;
}

export function Shell({ children }: { children: React.ReactNode }) {
  const nav = [["/", "Desk"], ["/quotes/new", "New quote"], ["/capacity", "Capacity & orders"], ["/assumptions", "Assumptions"]];
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hair pb-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">Quote Desk</Link>
        <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {nav.map(([h, l]) => <Link key={h} href={h} className="py-1 text-mute hover:text-accent">{l}</Link>)}
        </nav>
        <span className="pill border-accent text-accent">SAMPLE data - demo</span>
      </header>
      <main className="pt-5">{children}</main>
      <footer className="mt-12 border-t border-hair pt-4 text-xs text-mute">
        Independent demo built by Vinil Polepalli. Sample data and deterministic arithmetic only. Not affiliated with or endorsed by GUILD.
      </footer>
    </div>
  );
}

export function CapacityStrip({ weeks, weeksShown = 8 }: { weeks: WeekView[]; weeksShown?: number }) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
      {weeks.slice(0, weeksShown).map((w) => {
        const pb = (w.backlog / w.capacity) * 100, pc = (w.committed / w.capacity) * 100;
        return (
          <div key={w.week} className="min-w-0">
            <div className="flex h-24 flex-col-reverse overflow-hidden rounded-btn border border-hair bg-ground" role="img"
              aria-label={`Week of ${w.start}: ${w.backlog} backlog, ${w.committed} committed, ${w.available} available of ${w.capacity} hours`}>
              <div className="bg-mute/50" style={{ height: `${pb}%` }} />
              <div className="bg-accent" style={{ height: `${pc}%` }} />
            </div>
            <div className="mt-1 text-[11px] leading-tight text-mute"><span className="block">{w.start.slice(5)}</span><span className="mono block text-ink">{w.available}h free</span></div>
          </div>
        );
      })}
    </div>
  );
}
export function CapacityLegend() {
  return (
    <p className="mt-2 flex flex-wrap gap-4 text-xs text-mute">
      <span><i className="mr-1 inline-block h-2 w-2 bg-mute/50" />Starting backlog (SAMPLE)</span>
      <span><i className="mr-1 inline-block h-2 w-2 bg-accent" />Committed by accepted orders</span>
      <span><i className="mr-1 inline-block h-2 w-2 border border-hair" />Free</span>
    </p>
  );
}
