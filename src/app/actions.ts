"use server";

import { revalidatePath } from "next/cache";
import {
  recordExerciseResult,
  recordVocabReview,
  recordLessonCompletion,
  resetProgress,
} from "@/db/repositories";

function revalidateAll() {
  revalidatePath("/", "layout");
}

/** Records one exercise attempt (called by the runner after instant client-side grading). */
export async function submitExerciseResult(exerciseId: string, correct: boolean): Promise<void> {
  if (!exerciseId) return;
  await recordExerciseResult(exerciseId, correct);
  revalidateAll();
}

/** Records a flashcard review (SRS). */
export async function submitVocabReview(vocabId: string, remembered: boolean): Promise<void> {
  if (!vocabId) return;
  await recordVocabReview(vocabId, remembered);
  revalidateAll();
}

/** Marks a lesson as completed with the given score (0–100). */
export async function submitLessonCompletion(lessonId: string, score: number): Promise<void> {
  if (!lessonId || !Number.isFinite(score)) return;
  await recordLessonCompletion(lessonId, Math.round(Math.max(0, Math.min(100, score))));
  revalidateAll();
}

/** Wipes all learner progress (settings page). */
export async function resetAllProgress(): Promise<void> {
  await resetProgress();
  revalidateAll();
}
