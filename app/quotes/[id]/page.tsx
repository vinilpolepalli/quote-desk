import Link from "next/link";
import { notFound } from "next/navigation";
import { pageOwner } from "@/lib/owner";
import { getCatalog, getQuote, HttpError } from "@/lib/store";
import QuoteForm from "@/components/QuoteForm";
import QuoteSheet from "@/components/QuoteSheet";
import QuoteActions from "@/components/QuoteActions";
import { Status } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function QuotePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> }) {
  const o = await pageOwner();
  const { id } = await params;
  let q;
  try { q = await getQuote(o, id); } catch (e) { if (e instanceof HttpError) notFound(); throw e; }
  const editing = (await searchParams).edit === "1" && q.status === "open";
  const code = `Q-${String(q.number).padStart(4, "0")}`;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="label">{code} - revision {q.latest.rev}</p><h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight">{q.latest.part.name} x {q.latest.part.qty} <Status s={q.status} /></h1></div>
        {q.status === "open" && !editing && <Link className="btn" href={`/quotes/${id}?edit=1`}>Edit</Link>}
      </div>
      {editing ? <QuoteForm catalog={await getCatalog(o)} initial={q.latest.part} quoteId={id} partId={q.latest.part.id} /> : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="card">
            <p className="label mb-2">Latest revision (r{q.latest.rev}) - priced at assumptions v{q.latest.assumptionsVersion}, {q.latest.committedLoadAtPricing} h load ahead</p>
            <QuoteSheet r={q.latest.result} />
            {q.committedHours !== null && q.status !== "rejected" && <p className="mono mt-3 text-sm">Committed: {q.committedHours} h {q.status === "cancelled" ? "(released)" : ""}</p>}
          </section>
          <aside className="space-y-5">
            <section className="card space-y-3"><p className="label">Order</p><QuoteActions id={id} status={q.status} stale={q.stale} />
              {q.current && q.stale && (
                <div className="rounded-btn border border-hair p-3 text-sm"><p className="label mb-1">Repriced under current v{q.current.assumptionsVersion}</p>
                  <p className="mono">${q.current.result.total.toLocaleString("en-US")} / {q.current.result.leadWeeks} wk / {q.current.result.hoursNeeded} h</p></div>)}
              {q.current && !q.stale && <p className="text-xs text-mute">Live lead time with today&apos;s committed load: <span className="mono">{q.current.result.leadWeeks} wk</span></p>}
            </section>
            <section className="card"><p className="label mb-2">Revision history</p>
              <ul className="divide-y divide-hair text-sm">{q.revisions.map((r) => (
                <li key={r.rev} className="py-2"><span className="mono font-semibold">r{r.rev}</span> <span className="text-mute">assumptions v{r.assumptionsVersion}</span>
                  <span className="mono block text-xs">${r.result.total.toLocaleString("en-US")} / {r.result.leadWeeks} wk / {r.result.hoursNeeded} h / {r.result.flag}</span></li>))}</ul></section>
          </aside>
        </div>
      )}
    </div>
  );
}
