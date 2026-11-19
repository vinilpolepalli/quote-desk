import { pageOwner } from "@/lib/owner";
import { getCatalog } from "@/lib/store";
import QuoteForm from "@/components/QuoteForm";

export const dynamic = "force-dynamic";

export default async function NewQuote() {
  const o = await pageOwner();
  return (
    <div className="space-y-4">
      <div><p className="label">Quote sheet</p><h1 className="text-2xl font-semibold tracking-tight">New quote</h1></div>
      <QuoteForm catalog={await getCatalog(o)} />
    </div>
  );
}
