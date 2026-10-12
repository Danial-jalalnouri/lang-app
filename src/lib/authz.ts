import { auth } from "@clerk/nextjs/server";

/**
 * Resource-based auth (Clerk v7 pattern): redirects signed-out document
 * requests to /sign-in, returns 401 for Server Functions.
 */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth.protect();
  return userId;
}
