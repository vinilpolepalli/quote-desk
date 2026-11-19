import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Issues the httpOnly owner cookie on first visit. Data isolation keys off this id.
export function proxy(req: NextRequest) {
  if (req.cookies.get("qd_uid")) return NextResponse.next();
  const id = crypto.randomUUID();
  const headers = new Headers(req.headers);
  headers.set("cookie", [req.headers.get("cookie"), `qd_uid=${id}`].filter(Boolean).join("; "));
  const res = NextResponse.next({ request: { headers } });
  res.cookies.set("qd_uid", id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
