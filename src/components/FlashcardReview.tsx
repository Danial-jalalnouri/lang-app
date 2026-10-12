"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { submitVocabReview } from "@/app/actions";
import { speak, speechSupported } from "@/lib/speak";
import { Button, ProgressBar, buttonClass, cn } from "@/components/ui";

export interface ReviewWord {
  id: string;
  german: string;
  english: string;
  article?: string;
  plural?: string;
  exampleDe?: string;
  exampleEn?: string;
}

interface FlashcardReviewProps {
  words: ReviewWord[];
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel?: string;
  /** "srs" records spaced-repetition results; "practice" is a plain run-through. */
  mode?: "srs" | "practice";
}

export function FlashcardReview({
  words,
  title,
  subtitle,
  backHref,
  backLabel = "Back",
  mode = "srs",
}: FlashcardReviewProps) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [rememberedCount, setRememberedCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const word = words[idx];
  const total = words.length;

  useEffect(() => {
    if (word && !flipped && speechSupported()) {
      const t = setTimeout(() => speak(word.german), 150);
      return () => clearTimeout(t);
    }
  }, [idx, flipped, word]);

  const rate = (remembered: boolean) => {
    if (!word) return;
    if (mode === "srs") void submitVocabReview(word.id, remembered);
    if (remembered) setRememberedCount((c) => c + 1);
    if (idx + 1 >= total) {
      setFinished(true);
      return;
    }
    setIdx((i) => i + 1);
    setFlipped(false);
  };

  if (total === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold">Nothing to review right now 🎉</h2>
        <p className="mt-2 text-sm text-zinc-500">
          No words are due. Come back later, or start a new lesson.
        </p>
        <Link className={buttonClass("primary", "mt-4")} href={backHref}>
          {backLabel}
        </Link>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-indigo-500 text-3xl font-bold tabular-nums text-indigo-600">
          {rememberedCount}
          <span className="text-lg text-indigo-400">/{total}</span>
        </div>
        <h2 className="mt-4 text-xl font-semibold">Session complete</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {rememberedCount === total
            ? "Alles klar! You remembered every word."
            : "Forgotten words will come back sooner — that's how spaced repetition works."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="subtle" onClick={() => {
            setIdx(0);
            setFlipped(false);
            setRememberedCount(0);
            setFinished(false);
          }}>
            Review again
          </Button>
          <Link className={buttonClass("primary")} href={backHref}>
            {backLabel}
          </Link>
        </div>
      </div>
    );
  }

  const articleNoun = word.article ? `${word.article} ${word.german}` : word.german;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-zinc-700">{title}</div>
          {subtitle && <div className="truncate text-xs text-zinc-400">{subtitle}</div>}
        </div>
        <Link href={backHref} className="shrink-0 text-sm text-zinc-500 hover:text-zinc-900">
          ✕ Exit
        </Link>
      </div>

      <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
        <span>
          {idx + 1} / {total}
        </span>
        <span>{rememberedCount} remembered</span>
      </div>
      <ProgressBar value={((idx + (flipped ? 0.5 : 0)) / total) * 100} className="mb-5" />

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div
          className={cn(
            "flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center",
            flipped ? "border-indigo-200 bg-indigo-50/50" : "border-zinc-300 bg-zinc-50",
          )}
          onClick={() => !flipped && setFlipped(true)}
        >
          {!flipped ? (
            <>
              <div className="text-3xl font-medium">{articleNoun}</div>
              {word.plural && <div className="mt-1 text-sm text-zinc-400">{word.plural}</div>}
              <div className="mt-4 text-xs text-zinc-400">tap to reveal the meaning</div>
            </>
          ) : (
            <>
              <div className="text-2xl text-indigo-700">{word.english}</div>
              <div className="mt-2 text-sm text-zinc-500">{articleNoun}</div>
              {word.plural && <div className="text-xs text-zinc-400">{word.plural}</div>}
              {word.exampleDe && (
                <div className="mt-4 max-w-md text-sm text-zinc-600">
                  <div className="font-medium">{word.exampleDe}</div>
                  {word.exampleEn && <div className="text-zinc-400">{word.exampleEn}</div>}
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {!flipped ? (
            <>
              <Button
                variant="subtle"
                onClick={() => {
                  if (speechSupported()) speak(word.german);
                }}
              >
                🔊 Hear it
              </Button>
              <Button variant="accent" onClick={() => setFlipped(true)}>
                Show meaning
              </Button>
            </>
          ) : (
            <>
              <Button variant="danger" onClick={() => rate(false)}>
                Forgot it
              </Button>
              <Button variant="accent" onClick={() => rate(true)}>
                Remembered ✓
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
