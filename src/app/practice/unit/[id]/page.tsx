import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { getUnitExercises } from "@/db/repositories";
import { ExerciseRunner } from "@/components/ExerciseRunner";
import { buttonClass } from "@/components/ui";
import { PracticeSkeleton } from "@/components/PracticeSkeleton";

export default function UnitPracticePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PracticeSkeleton label="Loading unit exercises…" />}>
      <UnitPracticeView params={params} />
    </Suspense>
  );
}

async function UnitPracticeView({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const data = await getUnitExercises(id);

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-xl font-semibold">Unit not found</h1>
        <Link className={buttonClass("primary", "mt-4")} href="/">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <ExerciseRunner
      exercises={data.exercises}
      title={`${data.unit.titleEn} — full unit`}
      subtitle="All exercises from every lesson in this unit"
      backHref={`/units/${data.unit.slug}`}
      backLabel="Back to unit"
    />
  );
}
