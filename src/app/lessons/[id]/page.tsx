import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requireUserId } from "@/lib/authz";
import { getLesson } from "@/db/repositories";
import { SpeakButton } from "@/components/SpeakButton";
import { Card, LinkButton, PageHeader, ProgressBar, buttonClass } from "@/components/ui";

export default function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<LessonSkeleton />}>
      <LessonView params={params} />
    </Suspense>
  );
}

async function LessonView({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const userId = await requireUserId();
  const lesson = await getLesson(userId, id);

  if (!lesson) {
    return (
      <div>
        <PageHeader title="Lesson not found" />
        <Link className={buttonClass("primary")} href="/">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const pct = lesson.exerciseTotal ? (lesson.exerciseAttempted / lesson.exerciseTotal) * 100 : 0;

  return (
    <div>
      <PageHeader
        title={lesson.lesson.titleEn}
        subtitle={lesson.lesson.grammarSummaryEn}
        breadcrumb={
          <span className="flex gap-2">
            <Link href="/" className="hover:text-zinc-900">
              Dashboard
            </Link>
            <span className="text-zinc-300">/</span>
            <Link href={`/units/${lesson.unit.slug}`} className="hover:text-zinc-900">
              {lesson.unit.titleEn}
            </Link>
          </span>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <LinkButton href={`/practice/lesson/${lesson.lesson.id}`} variant="accent">
          ▶ Start exercises
        </LinkButton>
        <LinkButton href={`/flashcards/lesson/${lesson.lesson.id}`} variant="subtle">
          🃏 Flashcards ({lesson.vocabulary.length} words)
        </LinkButton>
        {lesson.completed && (
          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            ✓ Completed · best {lesson.score}%
          </span>
        )}
        <div className="ml-auto w-40">
          <div className="mb-1 flex justify-between text-xs text-zinc-400">
            <span>Exercises</span>
            <span>
              {lesson.exerciseAttempted}/{lesson.exerciseTotal}
            </span>
          </div>
          <ProgressBar value={pct} />
        </div>
      </div>

      {/* Grammar */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Grammar explained in English
        </h2>
        <div className="space-y-4">
          {lesson.grammarRules.map((rule) => (
            <Card key={rule.id}>
              <h3 className="font-semibold">{rule.titleEn}</h3>
              <p className="mt-1 rounded-lg bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800">
                {rule.ruleEn}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{rule.explanationEn}</p>
              <div className="mt-3 space-y-2">
                {rule.examples.map((ex, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-3 rounded-lg border border-zinc-100 bg-white px-3 py-2"
                  >
                    <div className="text-sm">
                      <div className="font-medium text-zinc-800">{ex.de}</div>
                      <div className="text-zinc-500">{ex.en}</div>
                    </div>
                    <SpeakButton text={ex.de} label="" className="!px-2.5" />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Vocabulary */}
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Vocabulary · {lesson.vocabulary.length} words
        </h2>
        <Card className="overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3 font-medium">German</th>
                <th className="px-4 py-3 font-medium">English</th>
                <th className="px-4 py-3 font-medium">Example</th>
                <th className="w-14 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {lesson.vocabulary.map((v) => (
                <tr key={v.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-2.5 align-top">
                    <div className="font-medium">
                      {v.article && <span className="mr-1 text-zinc-400">{v.article}</span>}
                      {v.german}
                    </div>
                    {v.plural && <div className="text-xs text-zinc-400">{v.plural}</div>}
                  </td>
                  <td className="px-4 py-2.5 align-top text-zinc-600">{v.english}</td>
                  <td className="px-4 py-2.5 align-top text-zinc-500">
                    {v.exampleDe && (
                      <>
                        <div>{v.exampleDe}</div>
                        {v.exampleEn && <div className="text-xs text-zinc-400">{v.exampleEn}</div>}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-2.5 align-top">
                    <SpeakButton text={v.german} label="" className="!px-2.5" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/units/${lesson.unit.slug}`} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Back to {lesson.unit.titleEn}
        </Link>
      </div>
    </div>
  );
}

function LessonSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-8 w-64 rounded bg-zinc-200" />
      <div className="mb-4 h-10 w-full max-w-md rounded-lg bg-zinc-200" />
      <div className="mb-8 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-zinc-200" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-zinc-200" />
    </div>
  );
}
