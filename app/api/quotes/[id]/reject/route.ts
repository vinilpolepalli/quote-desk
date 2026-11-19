import type { NextRequest } from "next/server";
import { handle } from "@/lib/http";
import { closeQuote } from "@/lib/store";
export const POST = (req: NextRequest, c: { params: Promise<{ id: string }> }) => handle(req, true, async (o) => closeQuote(o, (await c.params).id, "reject"));
