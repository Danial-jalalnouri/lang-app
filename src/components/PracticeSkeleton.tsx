export function PracticeSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-2xl animate-pulse">
      <div className="mb-5 h-4 w-48 rounded bg-zinc-200" />
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="mb-4 h-4 w-32 rounded bg-zinc-100" />
        <div className="mb-6 h-8 w-3/4 rounded bg-zinc-200" />
        <div className="space-y-3">
          <div className="h-12 rounded-lg bg-zinc-100" />
          <div className="h-12 rounded-lg bg-zinc-100" />
          <div className="h-12 rounded-lg bg-zinc-100" />
        </div>
        <p className="mt-6 text-center text-xs text-zinc-400">{label}</p>
      </div>
    </div>
  );
}
