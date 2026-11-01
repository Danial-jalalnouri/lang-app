import { clerkClient } from "@clerk/nextjs/server";
import { upsertUser } from "@/db/repositories";

export async function syncUser(userId: string): Promise<void> {
  try {
    const client = await clerkClient();
    const u = await client.users.getUser(userId);
    const primaryEmail =
      u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ??
      u.emailAddresses[0]?.emailAddress ??
      null;
    await upsertUser({
      id: u.id,
      email: primaryEmail,
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
      imageUrl: u.imageUrl,
      createdAt: u.createdAt ? new Date(u.createdAt) : null,
    });
  } catch {
    // best-effort; don't block auth
  }
}