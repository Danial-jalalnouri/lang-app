"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Exercise } from "@/content/types";
import { checkAnswer } from "@/lib/answer-check";
import { speak, speechSupported } from "@/lib/speak";
import {
  submitExerciseResult,
  submitLessonCompletion,
  submitVocabReview,
} from "@/app/actions";
import { Button, ProgressBar, buttonClass, cn } from "@/components/ui";

interface ExerciseRunnerProps {
  exercises: Exercise[];
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel?: string;
  /** When set, the lesson is marked completed with the final score. */
  lessonId?: string;
}

function correctAnswerText(ex: Exercise): string {
  switch (ex.type) {
    case "mcq":
      return ex.options[ex.answerIndex];
    case "translate":
      return ex.target;
    case "typing":
    case "fill_blank":
    case "listen":
      return ex.answer;
    case "flashcard":
      return ex.back;
  }
}

export function ExerciseRunner({
  exercises,
  title,
  subtitle,
  backHref,
  backLabel = "Back",
  lessonId,
}: ExerciseRunnerProps) {
  const total = exercises.length;
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const completionSent = useRef(false);

  const ex = exercises[idx];

  const record = useCallback(async (exercise: Exercise, correct: boolean) => {
    try {
      await submitExerciseResult(exercise.id, correct);
      if (exercise.type === "flashcard" && exercise.vocabId) {
        await submitVocabReview(exercise.vocabId, correct);
      }
    } catch {
      // Progress recording must never block the learner.
    }
  }, []);

  const grade = useCallback(
    (exercise: Exercise, correct: boolean) => {
      setLastCorrect(correct);
      setRevealed(true);
      if (correct) setCorrectCount((c) => c + 1);
      void record(exercise, correct);
    },
    [record],
  );

  const next = useCallback(() => {
    if (!revealed) return;
    if (idx + 1 >= total) {
      const score = Math.round((correctCount / Math.max(total, 1)) * 100);
      setFinished(true);
      if (lessonId && !completionSent.current) {
        completionSent.current = true;
        void submitLessonCompletion(lessonId, score);
      }
      return;
    }
    setIdx((i) => i + 1);
    setRevealed(false);
    setInput("");
    setSelected(null);
    setLastCorrect(null);
  }, [revealed, idx, total, correctCount, lessonId]);

  const check = useCallback(() => {
    if (!ex || revealed) return;
    if (ex.type === "flashcard" || ex.type === "mcq") return;
    if (ex.type === "translate") {
      grade(ex, checkAnswer(input, ex.target, ex.accepted ?? []));
      return;
    }
    grade(ex, checkAnswer(input, ex.answer, ex.accepted ?? []));
  }, [ex, revealed, input, grade]);

  const restart = () => {
    completionSent.current = false;
    setIdx(0);
    setRevealed(false);
    setInput("");
    setSelected(null);
    setLastCorrect(null);
    setCorrectCount(0);
    setFinished(false);
  };

  // Enter advances after grading (unless focus is in an input, which handles its own Enter).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (e.target instanceof HTMLInputElement) return;
      if (!revealed) return;
      e.preventDefault();
      next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, next]);

  // Auto-play listening audio when a listen exercise appears.
  useEffect(() => {
    if (ex?.type === "listen" && speechSupported()) {
      const t = setTimeout(() => speak(ex.audioText), 150);
      return () => clearTimeout(t);
    }
  }, [idx, ex]);

  if (total === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold">No exercises here yet</h2>
        <p className="mt-2 text-sm text-zinc-500">
          This session has no exercises. Head back and pick another lesson.
        </p>
        <Link className={buttonClass("primary", "mt-4")} href={backHref}>
          {backLabel}
        </Link>
      </div>
    );
  }

  if (finished) {
    const score = Math.round((correctCount / Math.max(total, 1)) * 100);
    const message =
      score >= 90
        ? "Ausgezeichnet! Excellent work."
        : score >= 70
          ? "Sehr gut! Nice job."
          : score >= 50
            ? "Gut gemacht — keep practising."
            : "Nochmal — try again!";
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-indigo-500 text-3xl font-bold tabular-nums text-indigo-600">
          {score}
        </div>
        <h2 className="mt-4 text-xl font-semibold">
          {correctCount} / {total} correct
        </h2>
        <p className="mt-1 text-sm text-zinc-500">{message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="subtle" onClick={restart}>
            Practice again
          </Button>
          <Link className={buttonClass("primary")} href={backHref}>
            {backLabel}
          </Link>
        </div>
      </div>
    );
  }

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
        <span>{correctCount} correct</span>
      </div>
      <ProgressBar value={((idx + (revealed ? 1 : 0)) / total) * 100} className="mb-5" />

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <ExerciseBody
          key={ex.id}
          exercise={ex}
          revealed={revealed}
          lastCorrect={lastCorrect}
          input={input}
          setInput={setInput}
          selected={selected}
          onSelect={(i) => {
            if (revealed || ex.type !== "mcq") return;
            setSelected(i);
            grade(ex, i === ex.answerIndex);
          }}
          onCheck={check}
          onGrade={(correct) => grade(ex, correct)}
          onNext={next}
        />
      </div>
    </div>
  );
}

interface BodyProps {
  exercise: Exercise;
  revealed: boolean;
  lastCorrect: boolean | null;
  input: string;
  setInput: (v: string) => void;
  selected: number | null;
  onSelect: (i: number) => void;
  onCheck: () => void;
  onGrade: (correct: boolean) => void;
  onNext: () => void;
}

function ExerciseBody({
  exercise: ex,
  revealed,
  lastCorrect,
  input,
  setInput,
  selected,
  onSelect,
  onCheck,
  onGrade,
  onNext,
}: BodyProps) {
  const [flipped, setFlipped] = useState(false);

  const feedback = (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm">
        {lastCorrect === true && <span className="font-medium text-green-600">✓ Correct!</span>}
        {lastCorrect === false && (
          <span className="text-red-600">
            ✗ Not quite — answer:{" "}
            <strong className="font-semibold">{correctAnswerText(ex)}</strong>
          </span>
        )}
      </div>
      <Button onClick={onNext}>Continue →</Button>
    </div>
  );

  switch (ex.type) {
    case "flashcard":
      if (revealed) {
        return (
          <div>
            <div className="mb-3 text-xs font uppercase tracking-wide text-zinc-400">{ex.prompt}</div>
            <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-6 text-center">
              <div className="text-xl text-indigo-700">{ex.back}</div>
              <div className="mt-2 text-sm text-zinc-500">{ex.front}</div>
            </div>
            {feedback}
          </div>
        );
      }
      if (!flipped) {
        return (
          <div>
            <div className="mb-3 text-xs font uppercase tracking-wide text-zinc-400">{ex.prompt}</div>
            <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
              <div className="text-2xl font-medium">{ex.front}</div>
              <div className="mt-3 text-xs text-zinc-400">tap to reveal</div>
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <SpeakButtonLocal text={ex.front} />
              <Button variant="accent" onClick={() => setFlipped(true)}>
                Show answer
              </Button>
            </div>
          </div>
        );
      }
      return (
        <div>
          <div className="mb-3 text-xs font uppercase tracking-wide text-zinc-400">{ex.prompt}</div>
          <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-6 text-center">
            <div className="text-xl text-indigo-700">{ex.back}</div>
            <div className="mt-2 text-sm text-zinc-500">{ex.front}</div>
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button variant="danger" onClick={() => onGrade(false)}>
              Again (forgot)
            </Button>
            <Button variant="accent" onClick={() => onGrade(true)}>
              Got it ✓
            </Button>
          </div>
        </div>
      );

    case "mcq":
      return (
        <div>
          <div className="mb-3 text-xs font uppercase tracking-wide text-zinc-400">{ex.prompt}</div>
          <p className="text-lg font-medium">{ex.question}</p>
          <div className="mt-4 grid gap-2">
            {ex.options.map((opt, i) => {
              const isAnswer = i === ex.answerIndex;
              const isPicked = i === selected;
              let cls = "border-zinc-200 bg-white hover:border-zinc-400 hover:bg-zinc-50";
              if (revealed && isAnswer) cls = "border-green-300 bg-green-50 text-green-800";
              else if (revealed && isPicked && !isAnswer)
                cls = "border-red-300 bg-red-50 text-red-700";
              else if (revealed) cls = "border-zinc-200 bg-white opacity-60";
              return (
                <button
                  key={i}
                  type="button"
                  disabled={revealed}
                  onClick={() => onSelect(i)}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    cls,
                  )}
                >
                  <span className="mr-2 font-medium text-zinc-400">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
          {revealed && (
            <div className="mt-4">
              {ex.explanation && <p className="mb-3 text-xs text-zinc-500">{ex.explanation}</p>}
              {feedback}
            </div>
          )}
        </div>
      );

    case "listen":
      return (
        <div>
          <div className="mb-3 text-xs font uppercase tracking-wide text-zinc-400">{ex.prompt}</div>
          <div className="flex flex-col items-center gap-3 rounded-lg bg-zinc-50 py-6">
            <button
              type="button"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-2xl text-white shadow transition hover:bg-indigo-500"
              onClick={() => speak(ex.audioText)}
              aria-label="Play audio"
            >
              🔊
            </button>
            <span className="text-xs text-zinc-400">Listen as often as you like</span>
          </div>
          <AnswerInput
            placeholder="Type what you hear (German)"
            input={input}
            setInput={setInput}
            revealed={revealed}
            onCheck={onCheck}
            autoFocus
          />
          {revealed && (
            <div className="mt-3 text-sm text-zinc-600">
              You heard: <strong>{ex.audioText}</strong>
            </div>
          )}
          {revealed && feedback}
        </div>
      );

    case "translate": {
      const deToEn = ex.direction === "de-en";
      return (
        <div>
          <div className="mb-3 text-xs font uppercase tracking-wide text-zinc-400">
            {ex.prompt} · {deToEn ? "German → English" : "English → German"}
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-zinc-50 px-4 py-4">
            <p className="text-lg font-medium">{ex.source}</p>
            {deToEn && <SpeakButtonLocal text={ex.source} />}
          </div>
          <AnswerInput
            placeholder={deToEn ? "Translate in English" : "Translate in German"}
            input={input}
            setInput={setInput}
            revealed={revealed}
            onCheck={onCheck}
            autoFocus
          />
          {revealed && feedback}
        </div>
      );
    }

    case "typing":
      return (
        <div>
          <div className="mb-3 text-xs font uppercase tracking-wide text-zinc-400">{ex.prompt}</div>
          <p className="text-lg font-medium">{ex.question}</p>
          {ex.hint && <p className="mt-1 text-xs text-zinc-400">Hint: {ex.hint}</p>}
          <AnswerInput
            placeholder="Type in German"
            input={input}
            setInput={setInput}
            revealed={revealed}
            onCheck={onCheck}
            autoFocus
          />
          {revealed && feedback}
        </div>
      );

    case "fill_blank": {
      const [before, after] = ex.sentence.split("___");
      return (
        <div>
          <div className="mb-3 text-xs font uppercase tracking-wide text-zinc-400">{ex.prompt}</div>
          <p className="text-lg leading-relaxed">
            {before}
            <input
              value={revealed ? ex.answer : input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (revealed) onNext();
                  else onCheck();
                }
              }}
              disabled={revealed}
              autoFocus
              placeholder="…"
              aria-label="Missing word"
              className={cn(
                "mx-1 w-36 border-b-2 px-1 text-center font-medium outline-none",
                revealed
                  ? lastCorrect
                    ? "border-green-400 text-green-700"
                    : "border-red-400 text-red-700"
                  : "border-indigo-400 bg-indigo-50 focus:border-indigo-600",
              )}
            />
            {after}
          </p>
          {ex.hint && !revealed && <p className="mt-2 text-xs text-zinc-400">Hint: {ex.hint}</p>}
          {!revealed && (
            <div className="mt-5">
              <Button onClick={onCheck} disabled={!input.trim()}>
                Check
              </Button>
            </div>
          )}
          {revealed && feedback}
        </div>
      );
    }
  }
}

function AnswerInput({
  placeholder,
  input,
  setInput,
  revealed,
  onCheck,
  autoFocus,
}: {
  placeholder: string;
  input: string;
  setInput: (v: string) => void;
  revealed: boolean;
  onCheck: () => void;
  autoFocus?: boolean;
}) {
  if (revealed) return null;
  return (
    <div className="mt-4 flex gap-2">
      <input
        autoFocus={autoFocus}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onCheck();
          }
        }}
        placeholder={placeholder}
        className="flex-1 rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
      <Button onClick={onCheck} disabled={!input.trim()}>
        Check
      </Button>
    </div>
  );
}

function SpeakButtonLocal({ text }: { text: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (speechSupported()) speak(text);
      }}
      aria-label="Play audio"
      className={buttonClass("subtle")}
    >
      🔊
    </button>
  );
}
