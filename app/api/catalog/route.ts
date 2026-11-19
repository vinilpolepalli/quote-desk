import type { NextRequest } from "next/server";
import { handle } from "@/lib/http";
import { getCatalog } from "@/lib/store";
export const GET = (req: NextRequest) => handle(req, false, async (o) => ({ sample: true, parts: await getCatalog(o) }));
