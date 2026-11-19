"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function QuoteActions({ id, status, stale }: { id: string; status: string; stale: boolean }) {
  const [err, setErr] = useState("");
  const router = useRouter();
  async function act(path: string) {
    const r = await fetch(`/api/quotes/${id}/${path}`, { method: "POST" });
    const j = await r.json();
    if (!r.ok) return setErr(j.error);
    setErr(""); router.refresh();
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "open" && <button className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-40" disabled={stale} title={stale ? "Save a new revision first" : undefined} onClick={() => act("accept")}>Accept - commit hours</button>}
        {status === "open" && <button className="btn" onClick={() => act("reject")}>Reject</button>}
        {status === "accepted" && <button className="btn" onClick={() => act("cancel")}>Cancel order - free hours</button>}
      </div>
      {stale && <p className="text-xs text-mute">Committed load or assumptions changed since this revision. Use Edit, then Save as new revision at current terms, before accepting.</p>}
      {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
    </div>
  );
}
