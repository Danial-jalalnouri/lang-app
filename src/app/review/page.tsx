import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requireUserId } from "@/lib/authz";
import { getDueWords, getNewWords, getReviewStats } from "@/db/repositories";
import { FlashcardReview } from "@/components/FlashcardReview";
import { Card, PageHeader, Stat, buttonClass } from "@/components/ui";

export default function ReviewPage() {
  return (
    <Suspense fallback={<ReviewSkeleton />}>
      <ReviewView />
    </Suspense>
  );
}

async function ReviewView() {
  await connection();
  const userId = await requireUserId();
  const stats = await getReviewStats(userId);

  if (stats.due === 0 && stats.newWords === 0) {
    return (
      <div>
        <PageHeader title="Word review" subtitle="Spaced repetition keeps vocabulary in your long-term memory." />
        <Card className="text-center">
          <div className="text-4xl">🎉</div>
          <h2 className="mt-3 text-lg font-semibold">
            {stats.learned > 0 ? "Nothing due right now" : "No words in the queue yet"}
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            {stats.learned > 0
              ? `You have ${stats.learned} word${stats.learned === 1 ? "" : "s"} in rotation (${stats.mastered} mastered). Come back later, or study a lesson.`
              : "Study a lesson first — its words will enter your review queue automatically."}
          </p>
          <Link className={buttonClass("primary", "mt-4")} href="/">
            Go to dashboard
          </Link>
        </Card>
      </div>
    );
  }

  const due = await getDueWords(userId, 30);
  const fresh = stats.due < 30 ? await getNewWords(userId, 20 - Math.min(stats.due, 10)) : [];
  const words = [...due, ...fresh];

  return (
    <div>
      <PageHeader
        title="Word review"
        subtitle="Spaced repetition keeps vocabulary in your long-term memory."
        breadcrumb={
          <Link href="/" className="hover:text-zinc-900">
            Dashboard
          </Link>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Due now" value={stats.due} />
        <Stat label="New to learn" value={stats.newWords} />
        <Stat label="In rotation" value={stats.learned} />
        <Stat label="Mastered" value={stats.mastered} />
      </div>
      <FlashcardReview
        words={words}
        title={stats.due > 0 ? "Due words" : "New words"}
        subtitle={stats.due > 0 && stats.newWords > 0 ? `Due words first, then ${Math.min(fresh.length, stats.newWords)} new` : undefined}
        backHref="/"
        backLabel="Dashboard"
        mode="srs"
      />
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-8 w-56 rounded bg-zinc-200" />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-zinc-200" />
        ))}
      </div>
      <div className="mx-auto h-80 max-w-2xl rounded-xl bg-zinc-200" />
    </div>
  );
}
