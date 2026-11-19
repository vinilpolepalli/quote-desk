import type { NextRequest } from "next/server";
import { handle, readJson } from "@/lib/http";
import { getAssumptions, saveAssumptions, listAssumptionVersions, HttpError } from "@/lib/store";
import { parseAssumptions } from "@/lib/validate";
export const GET = (req: NextRequest) => handle(req, false, async (o) => ({ sample: true, current: await getAssumptions(o), history: await listAssumptionVersions(o) }));
export const PUT = (req: NextRequest) => handle(req, true, async (o) => {
  const r = parseAssumptions(await readJson(req));
  if (!r.ok) throw new HttpError(400, r.error);
  return saveAssumptions(o, r.value);
});
