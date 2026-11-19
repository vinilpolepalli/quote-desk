import { pageOwner } from "@/lib/owner";
import { getAssumptions, listAssumptionVersions } from "@/lib/store";
import AssumptionsForm from "@/components/AssumptionsForm";

export const dynamic = "force-dynamic";

export default async function Assumptions() {
  const o = await pageOwner();
  const cur = await getAssumptions(o);
  const hist = await listAssumptionVersions(o);
  return (
    <div className="space-y-5">
      <div><p className="label">Shop assumptions - SAMPLE values</p><h1 className="text-2xl font-semibold tracking-tight">Assumptions v{cur.version}</h1>
        <p className="mt-1 max-w-2xl text-sm text-mute">Each save creates a new version. Quotes record the version that priced them; open quotes show a live repricing under the current version and can be re-saved as a new revision. Accepted orders keep their committed hours.</p></div>
      <AssumptionsForm key={cur.version} initial={cur.values} />
      <section className="card"><p className="label mb-2">Version history</p>
        <ul className="divide-y divide-hair text-sm">{hist.map((h) => (
          <li key={h.version} className="mono flex flex-wrap justify-between gap-2 py-2"><span>v{h.version}</span><span className="text-mute">{h.createdAt.slice(0, 19).replace("T", " ")} UTC</span>
            <span>5ax ${h.values.rate5ax} / 3ax ${h.values.rate3ax} / cap {h.values.capacityHours}h / backlog {h.values.backlogHours}h / markup {h.values.markupPct}%</span></li>))}</ul></section>
    </div>
  );
}
