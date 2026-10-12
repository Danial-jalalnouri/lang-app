import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { getDashboard } from "@/db/repositories";
import { Card, LinkButton, PageHeader, ProgressBar, Stat, buttonClass, cn } from "@/components/ui";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardView />
    </Suspense>
  );
}

async function DashboardView() {
  await connection();
  const data = await getDashboard();

  if (data.units.length === 0) {
    return (
      <div>
        <PageHeader title="Welcome to DeutschStart" />
        <Card className="text-center">
          <h2 className="text-lg font-semibold">No course content yet</h2>
          <p className="mt-2 text-sm text-zinc-500">
            The database is empty. Load the A1 course with{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5">npm run seed</code>, then refresh.
          </p>
        </Card>
      </div>
    );
  }

  const firstIncomplete = data.units.find((u) => u.completedLessons < u.totalLessons);
  const continueHref = firstIncomplete ? `/units/${firstIncomplete.slug}` : "/review";
  const started = data.units.some((u) => u.attemptedExercises > 0);

  return (
    <div>
      <PageHeader
        title={`${data.level.code} · ${data.level.name.replace(/^A1 — /, "")}`}
        subtitle="Learn German step by step: vocabulary, grammar, listening and review."
        breadcrumb={
          <span className="inline-flex items-center gap-3">
            <span>
              🔥 {data.streak} day streak
              {data.bestStreak > 0 && (
                <span className="ml-2 text-zinc-400">(best: {data.bestStreak})</span>
              )}
            </span>
            {data.totalDue > 0 && (
              <Link href="/review" className="font-medium text-indigo-600 hover:underline">
                {data.totalDue} word{data.totalDue === 1 ? "" : "s"} due for review →
              </Link>
            )}
          </span>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Units completed" value={`${data.units.filter((u) => u.completedLessons === u.totalLessons).length}/${data.units.length}`} />
        <Stat label="Exercises done" value={data.units.reduce((n, u) => n + u.attemptedExercises, 0)} />
        <Stat label="Words in course" value={data.units.reduce((n, u) => n + u.totalWords, 0)} />
        <Stat label="Words due" value={data.totalDue} />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-500">Your course</h2>
        <Link className={buttonClass("primary")} href={continueHref}>
          {started ? "Continue learning →" : "Start learning →"}
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {data.units.map((u, i) => {
          const lessonPct = u.totalLessons ? (u.completedLessons / u.totalLessons) * 100 : 0;
          const exercisePct = u.totalExercises ? (u.attemptedExercises / u.totalExercises) * 100 : 0;
          const done = u.completedLessons === u.totalLessons && u.totalLessons > 0;
          return (
            <Link key={u.id} href={`/units/${u.slug}`} className="group">
              <Card className={cn("h-full transition group-hover:border-zinc-400", done && "border-green-200")}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-medium text-zinc-400">Unit {i + 1}</div>
                    <h3 className="font-semibold group-hover:text-indigo-700">{u.titleEn}</h3>
                  </div>
                  {done ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      ✓ done
                    </span>
                  ) : u.dueWords > 0 ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {u.dueWords} due
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{u.descriptionEn}</p>
                <div className="mt-4 space-y-2">
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-zinc-400">
                      <span>Lessons</span>
                      <span>
                        {u.completedLessons}/{u.totalLessons}
                      </span>
                    </div>
                    <ProgressBar value={lessonPct} />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-zinc-400">
                      <span>Exercises</span>
                      <span>
                        {u.attemptedExercises}/{u.totalExercises}
                      </span>
                    </div>
                    <ProgressBar value={exercisePct} className="!bg-zinc-100 [&>div]:bg-emerald-500" />
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <LinkButton href="/review" variant="accent">
          Review due words
        </LinkButton>
        <LinkButton href="/settings" variant="subtle">
          Settings
        </LinkButton>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-8 w-64 rounded bg-zinc-200" />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-zinc-200" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-44 rounded-xl bg-zinc-200" />
        ))}
      </div>
    </div>
  );
}
