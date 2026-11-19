import type { Quote } from "@/lib/engine";
import { Chip } from "@/components/ui";

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function QuoteSheet({ r, note }: { r: Quote; note?: string }) {
  const parts: [string, number][] = [["Material", r.material], ["Setup", r.setup], ["Machine", r.machine], ["Inspection", r.inspection]];
  const sum = parts.reduce((s, [, v]) => s + v, 0) || 1;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><Chip flag={r.flag} />{note && <span className="text-xs text-mute">{note}</span>}</div>
      <div className="grid grid-cols-3 gap-2">
        {[["Total (SAMPLE)", usd(r.total)], ["Per unit", usd(r.perUnit)], ["Lead time", `${r.leadWeeks} wk / ${r.leadDays} d`]].map(([l, v]) => (
          <div key={l} className="rounded-btn border border-hair p-2"><p className="label">{l}</p><p className="mono text-base font-semibold sm:text-lg">{v}</p></div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><p className="label">Machine-hours</p><p className="mono">{r.hoursNeeded} h</p></div>
        <div><p className="label">Load incl. this lot</p><p className="mono">{Math.round(r.loadRatio * 100)}% of a week</p></div>
      </div>
      <div>
        <p className="label mb-1">Cost breakdown</p>
        <div className="flex h-3 overflow-hidden rounded-btn border border-hair" aria-hidden>
          {parts.map(([k, v], i) => <div key={k} style={{ width: `${(v / sum) * 100}%`, opacity: 1 - i * 0.22 }} className="bg-accent" />)}
        </div>
        <table className="mt-2 w-full text-sm"><tbody>{parts.map(([k, v]) => <tr key={k}><td className="py-0.5">{k}</td><td className="mono text-right">{usd(v)}</td></tr>)}</tbody></table>
      </div>
      <div>
        <p className="label mb-1">Why this flag</p>
        <ul className="list-disc space-y-0.5 pl-5 text-sm">{r.reasons.map((x) => <li key={x}>{x}</li>)}</ul>
      </div>
      <div>
        <p className="label mb-1">Formulas per line</p>
        <div className="divide-y divide-hair rounded-btn border border-hair">
          {r.lines.map((l) => (
            <details key={l.key} className="group px-3 py-2 text-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2"><span>{l.label}</span><span className="mono">{l.value}</span></summary>
              <p className="mono mt-1 break-words text-xs text-mute">{l.formula}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
