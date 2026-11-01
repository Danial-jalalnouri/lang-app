import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/authz";

export async function isOrgAdmin(userId?: string): Promise<boolean> {
  const id = userId ?? (await auth()).userId;
  if (!id) return false;
  const session = await auth();
  if (session.orgRole === "org:admin") return true;
  try {
    const client = await clerkClient();
    const memberships = await client.users.getOrganizationMembershipList({ userId: id });
    return memberships.data.some((m) => m.role === "org:admin");
  } catch {
    return false;
  }
}

export async function requireAdmin(): Promise<string> {
  const userId = await requireUserId();
  if (!(await isOrgAdmin(userId))) {
    redirect("/");
  }
  return userId;
}