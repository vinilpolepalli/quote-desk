import type { NextRequest } from "next/server";
import { handle, readJson } from "@/lib/http";
import { priceNow, HttpError } from "@/lib/store";
import { parsePart } from "@/lib/validate";
export const POST = (req: NextRequest) => handle(req, false, async (o) => {
  const r = parsePart(await readJson(req));
  if (!r.ok) throw new HttpError(400, r.error);
  return priceNow(o, r.value);
});
