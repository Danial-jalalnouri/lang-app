import { SignInButton, SignUpButton } from "@clerk/nextjs";

export function AuthButtons() {
  return (
    <span className="ml-2 flex items-center gap-2">
      <SignInButton mode="modal">
        <button
          type="button"
          className="rounded-md px-3 py-1.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
        >
          Sign in
        </button>
      </SignInButton>
      <SignUpButton mode="modal">
        <button
          type="button"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-white transition hover:bg-zinc-700"
        >
          Sign up
        </button>
      </SignUpButton>
    </span>
  );
}
