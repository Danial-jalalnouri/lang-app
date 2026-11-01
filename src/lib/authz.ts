import { auth } from "@clerk/nextjs/server";
import { syncUser } from "@/lib/user-sync";

/**
 * Resource-based auth (Clerk v7 pattern): redirects signed-out document
 * requests to /sign-in, returns 401 for Server Functions.
 */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth.protect();
  await syncUser(userId);
  return userId;
}
