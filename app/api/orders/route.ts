import type { NextRequest } from "next/server";
import { handle } from "@/lib/http";
import { listQuotes } from "@/lib/store";
export const GET = (req: NextRequest) => handle(req, false, async (o) => (await listQuotes(o)).filter((q) => q.status === "accepted"));
