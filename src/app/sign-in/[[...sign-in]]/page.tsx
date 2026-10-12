import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense fallback={<div className="h-96 w-96 animate-pulse rounded-xl bg-zinc-200" />}>
        <SignIn />
      </Suspense>
    </div>
  );
}
