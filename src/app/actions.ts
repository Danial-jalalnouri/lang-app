"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/authz";
import { requireAdmin } from "@/lib/admin";
import { canAccessUnit } from "@/lib/access";
import {
  recordExerciseResult,
  recordVocabReview,
  recordLessonCompletion,
  resetProgress,
  updateUserAccountType,
  getUnitIdForExercise,
  getUnitIdForVocab,
  getUnitIdForLesson,
} from "@/db/repositories";

async function assertUnitAccess(userId: string, unitId: string | null) {
  if (unitId && !(await canAccessUnit(userId, unitId))) {
    throw new Error("Forbidden");
  }
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

/** Records one exercise attempt (called by the runner after instant client-side grading). */
export async function submitExerciseResult(exerciseId: string, correct: boolean): Promise<void> {
  if (!exerciseId) return;
  const userId = await requireUserId();
  await assertUnitAccess(userId, await getUnitIdForExercise(exerciseId));
  await recordExerciseResult(userId, exerciseId, correct);
  revalidateAll();
}

/** Records a flashcard review (SRS). */
export async function submitVocabReview(vocabId: string, remembered: boolean): Promise<void> {
  if (!vocabId) return;
  const userId = await requireUserId();
  await assertUnitAccess(userId, await getUnitIdForVocab(vocabId));
  await recordVocabReview(userId, vocabId, remembered);
  revalidateAll();
}

/** Marks a lesson as completed with the given score (0–100). */
export async function submitLessonCompletion(lessonId: string, score: number): Promise<void> {
  if (!lessonId || !Number.isFinite(score)) return;
  const userId = await requireUserId();
  await assertUnitAccess(userId, await getUnitIdForLesson(lessonId));
  await recordLessonCompletion(userId, lessonId, Math.round(Math.max(0, Math.min(100, score))));
  revalidateAll();
}

/** Wipes the signed-in user's progress (settings page). */
export async function resetAllProgress(): Promise<void> {
  const userId = await requireUserId();
  await resetProgress(userId);
  revalidateAll();
}

export async function setUserAccountType(userId: string, accountType: "standard" | "super"): Promise<void> {
  await requireAdmin();
  await updateUserAccountType(userId, accountType);
  revalidatePath("/admin");
}
