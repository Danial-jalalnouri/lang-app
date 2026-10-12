"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/authz";
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
  const userId = await requireUserId();
  await recordExerciseResult(userId, exerciseId, correct);
  revalidateAll();
}

/** Records a flashcard review (SRS). */
export async function submitVocabReview(vocabId: string, remembered: boolean): Promise<void> {
  if (!vocabId) return;
  const userId = await requireUserId();
  await recordVocabReview(userId, vocabId, remembered);
  revalidateAll();
}

/** Marks a lesson as completed with the given score (0–100). */
export async function submitLessonCompletion(lessonId: string, score: number): Promise<void> {
  if (!lessonId || !Number.isFinite(score)) return;
  const userId = await requireUserId();
  await recordLessonCompletion(userId, lessonId, Math.round(Math.max(0, Math.min(100, score))));
  revalidateAll();
}

/** Wipes the signed-in user's progress (settings page). */
export async function resetAllProgress(): Promise<void> {
  const userId = await requireUserId();
  await resetProgress(userId);
  revalidateAll();
}
