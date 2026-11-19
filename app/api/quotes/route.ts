import type { NextRequest } from "next/server";
import { handle, readJson } from "@/lib/http";
import { createQuote, listQuotes, HttpError } from "@/lib/store";
import { parsePart } from "@/lib/validate";
export const GET = (req: NextRequest) => handle(req, false, (o) => listQuotes(o));
export const POST = (req: NextRequest) => handle(req, true, async (o) => {
  const r = parsePart(await readJson(req));
  if (!r.ok) throw new HttpError(400, r.error);
  return createQuote(o, r.value);
}, 201);
