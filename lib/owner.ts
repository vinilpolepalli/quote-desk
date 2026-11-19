import { cookies } from "next/headers";
import { ensureOwner } from "./store";

export async function pageOwner(): Promise<string> {
  const id = (await cookies()).get("qd_uid")?.value;
  if (!id) throw new Error("owner cookie missing");
  await ensureOwner(id);
  return id;
}
