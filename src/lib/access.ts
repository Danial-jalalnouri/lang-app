import { query } from "@/db/client";
import { getUser } from "@/db/repositories";

export async function isSuperUser(userId: string): Promise<boolean> {
  const u = await getUser(userId);
  return u?.accountType === "super";
}

export async function canAccessUnit(userId: string, unitId: string): Promise<boolean> {
  if (await isSuperUser(userId)) return true;
  const rows = await query<{ id: string }>("SELECT id FROM units ORDER BY order_index LIMIT 1");
  return rows[0]?.id === unitId;
}

export async function firstUnitId(): Promise<string | null> {
  const rows = await query<{ id: string }>("SELECT id FROM units ORDER BY order_index LIMIT 1");
  return rows[0]?.id ?? null;
}