import type { NextRequest } from "next/server";
import { handle } from "@/lib/http";
import { acceptQuote } from "@/lib/store";
export const POST = (req: NextRequest, c: { params: Promise<{ id: string }> }) => handle(req, true, async (o) => acceptQuote(o, (await c.params).id));
