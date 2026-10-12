import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requireUserId } from "@/lib/authz";
import { getUnit } from "@/db/repositories";
import { Card, LinkButton, PageHeader, ProgressBar, buttonClass } from "@/components/ui";

export default function UnitPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<UnitSkeleton />}>
      <UnitView params={params} />
    </Suspense>
  );
}

async function UnitView({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const userId = await requireUserId();
  const unit = await getUnit(userId, slug);

  if (!unit) {
    return (
      <div>
        <PageHeader title="Unit not found" />
        <Link className={buttonClass("primary")} href="/">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const totalExercises = unit.lessons.reduce((n, l) => n + l.totalExercises, 0);
  const attempted = unit.lessons.reduce((n, l) => n + l.attemptedExercises, 0);

  return (
    <div>
      <PageHeader
        title={`${unit.unit.titleEn}`}
        subtitle={unit.unit.descriptionEn}
        breadcrumb={
          <Link href="/" className="hover:text-zinc-900">
            Dashboard
          </Link>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3">
        <div className="text-sm text-zinc-500">
          Progress: <strong className="text-zinc-800">{attempted}</strong> / {totalExercises}{" "}
          exercises tried
        </div>
        <LinkButton href={`/practice/unit/${unit.unit.id}`} variant="accent">
          ▶ Practice whole unit
        </LinkButton>
      </div>

      <div className="space-y-4">
        {unit.lessons.map((l, i) => (
          <Card key={l.lesson.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <h2 className="font-semibold">{l.lesson.titleEn}</h2>
                  {l.completed && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      ✓ {l.score}%
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{l.lesson.grammarSummaryEn}</p>
                <div className="mt-3 max-w-md">
                  <div className="mb-1 flex justify-between text-xs text-zinc-400">
                    <span>
                      {l.totalWords} words · {l.totalExercises} exercises
                    </span>
                    <span>
                      {l.attemptedExercises}/{l.totalExercises} done
                    </span>
                  </div>
                  <ProgressBar
                    value={l.totalExercises ? (l.attemptedExercises / l.totalExercises) * 100 : 0}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Link className={buttonClass("subtle")} href={`/lessons/${l.lesson.id}`}>
                  Study
                </Link>
                <Link className={buttonClass("primary")} href={`/practice/lesson/${l.lesson.id}`}>
                  Practice
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}

function UnitSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-8 w-72 rounded bg-zinc-200" />
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-zinc-200" />
        ))}
      </div>
    </div>
  );
}
