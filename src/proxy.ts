import { clerkMiddleware } from "@clerk/nextjs/server";

// Resource-based auth: every protected page/action calls requireUserId()
// (src/lib/authz.ts), which redirects signed-out visitors to /sign-in.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
