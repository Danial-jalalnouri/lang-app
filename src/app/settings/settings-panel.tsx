"use client";

import { useState, useTransition } from "react";
import { resetAllProgress } from "@/app/actions";
import { Button, Card, PageHeader } from "@/components/ui";

export function SettingsPanel({ dbLabel }: { dbLabel: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const onReset = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      await resetAllProgress();
      setConfirming(false);
      setDone(true);
    });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Settings"
        subtitle="DeutschStart v1 — no account, no payments; progress lives in your Neon Postgres database."
      />

      <Card className="mb-4">
        <h2 className="font-semibold">Course</h2>
        <dl className="mt-3 space-y-1 text-sm text-zinc-600">
          <div className="flex justify-between">
            <dt>Level</dt>
            <dd>A1 — Beginner (German for English speakers)</dd>
          </div>
          <div className="flex justify-between">
            <dt>Content</dt>
            <dd>6 units · 18 lessons</dd>
          </div>
          <div className="flex justify-between">
            <dt>Database</dt>
            <dd className="font-mono text-xs">{dbLabel}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-zinc-400">
          Course content lives in <code className="rounded bg-zinc-100 px-1">src/content/</code>{" "}
          and is loaded with <code className="rounded bg-zinc-100 px-1">npm run seed</code>.
          Re-seeding never deletes your progress.
        </p>
      </Card>

      <Card>
        <h2 className="font-semibold text-red-700">Danger zone</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Erases all progress: completed lessons, scores, streak and the spaced-repetition
          queue. Course content is untouched.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Button variant="danger" onClick={onReset} disabled={pending || done}>
            {pending
              ? "Resetting…"
              : done
                ? "✓ Progress reset"
                : confirming
                  ? "Really reset? Click again"
                  : "Reset all progress"}
          </Button>
          {confirming && !done && (
            <button
              type="button"
              className="text-sm text-zinc-400 hover:text-zinc-700"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
