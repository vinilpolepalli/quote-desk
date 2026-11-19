import type { NextRequest } from "next/server";
import { handle, readJson } from "@/lib/http";
import { getQuote, reviseQuote, HttpError } from "@/lib/store";
import { parsePart } from "@/lib/validate";
type Ctx = { params: Promise<{ id: string }> };
export const GET = (req: NextRequest, c: Ctx) => handle(req, false, async (o) => getQuote(o, (await c.params).id));
export const PUT = (req: NextRequest, c: Ctx) => handle(req, true, async (o) => {
  const r = parsePart(await readJson(req));
  if (!r.ok) throw new HttpError(400, r.error);
  return reviseQuote(o, (await c.params).id, r.value);
});
