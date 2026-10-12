import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requireUserId } from "@/lib/authz";
import { getLesson } from "@/db/repositories";
import { FlashcardReview } from "@/components/FlashcardReview";
import { buttonClass } from "@/components/ui";

export default function LessonFlashcardsPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto h-80 max-w-2xl animate-pulse rounded-xl bg-zinc-200" />
      }
    >
      <LessonFlashcardsView params={params} />
    </Suspense>
  );
}

async function LessonFlashcardsView({ params }: { params: Promise<{ id: string }> }) {
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
    <FlashcardReview
      words={lesson.vocabulary}
      title={`${lesson.lesson.titleEn} — flashcards`}
      subtitle={`${lesson.vocabulary.length} words · they enter your review queue as you go`}
      backHref={`/lessons/${lesson.lesson.id}`}
      backLabel="Back to lesson"
      mode="srs"
    />
  );
}
