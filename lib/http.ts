import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ensureOwner, HttpError } from "./store.ts";

export const MAX_BODY = 20 * 1024;
export const WRITES_PER_HOUR = 120;
const hits = new Map<string, number[]>();

export async function ownerOf(req: NextRequest): Promise<string> {
  const id = req.cookies.get("qd_uid")?.value;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) throw new HttpError(401, "missing owner cookie; load the site first");
  await ensureOwner(id);
  return id;
}

function limit(owner: string) {
  const t = Date.now();
  const arr = (hits.get(owner) ?? []).filter((x) => t - x < 3600_000);
  if (arr.length >= WRITES_PER_HOUR) throw new HttpError(429, `rate limit: ${WRITES_PER_HOUR} writes/hour`);
  arr.push(t);
  hits.set(owner, arr);
}

export async function readJson(req: NextRequest): Promise<unknown> {
  const text = await req.text();
  if (Buffer.byteLength(text) > MAX_BODY) throw new HttpError(413, "body exceeds 20KB");
  try { return JSON.parse(text); } catch { throw new HttpError(400, "invalid JSON"); }
}

export async function handle(req: NextRequest, write: boolean, fn: (owner: string) => Promise<unknown> | unknown, status = 200) {
  try {
    const len = Number(req.headers.get("content-length") ?? 0);
    if (len > MAX_BODY) throw new HttpError(413, "body exceeds 20KB");
    const owner = await ownerOf(req);
    if (write) limit(owner);
    return NextResponse.json(await fn(owner), { status });
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
