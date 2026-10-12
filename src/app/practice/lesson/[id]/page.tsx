import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requireUserId } from "@/lib/authz";
import { getLesson } from "@/db/repositories";
import { ExerciseRunner } from "@/components/ExerciseRunner";
import { buttonClass } from "@/components/ui";
import { PracticeSkeleton } from "@/components/PracticeSkeleton";

export default function LessonPracticePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PracticeSkeleton label="Loading exercises…" />}>
      <LessonPracticeView params={params} />
    </Suspense>
  );
}

async function LessonPracticeView({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const userId = await requireUserId();
  const lesson = await getLesson(userId, id);

  if (!lesson) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-xl font-semibold">Lesson not found</h1>
        <Link className={buttonClass("primary", "mt-4")} href="/">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <ExerciseRunner
      exercises={lesson.exercises}
      title={lesson.lesson.titleEn}
      subtitle={`${lesson.unit.titleEn} · lesson practice`}
      backHref={`/lessons/${lesson.lesson.id}`}
      backLabel="Back to lesson"
      lessonId={lesson.lesson.id}
    />
  );
}
