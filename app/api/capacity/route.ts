import type { NextRequest } from "next/server";
import { handle } from "@/lib/http";
import { getCapacity } from "@/lib/store";
export const GET = (req: NextRequest) => handle(req, false, (o) => getCapacity(o, Number(req.nextUrl.searchParams.get("weeks") ?? 8) || 8));
