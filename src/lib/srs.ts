/** Simplified spaced-repetition (Leitner boxes) + daily streak helpers. */

/** Days until review per box; box 0 uses minutes (same-session retry). */
const BOX_INTERVALS_DAYS = [0, 1, 2, 4, 7, 14, 30];
export const MAX_BOX = BOX_INTERVALS_DAYS.length - 1;

export function nextDueAt(box: number, from: Date = new Date()): string {
  const days = BOX_INTERVALS_DAYS[Math.min(Math.max(box, 0), MAX_BOX)];
  const ms = days === 0 ? 10 * 60 * 1000 : days * 24 * 60 * 60 * 1000;
  return new Date(from.getTime() + ms).toISOString();
}

export function nextBox(currentBox: number, remembered: boolean): number {
  if (!remembered) return 0;
  return Math.min(currentBox + 1, MAX_BOX);
}

export function dayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function yesterdayKey(d: Date = new Date()): string {
  return dayKey(new Date(d.getTime() - 24 * 60 * 60 * 1000));
}

/**
 * Returns the new streak after an activity on `today`.
 * Same day → unchanged; continued from yesterday → +1; gap → 1.
 */
export function updateStreak(
  current: number,
  lastDay: string | null,
  today: string = dayKey(),
): number {
  if (lastDay === today) return current;
  if (lastDay === yesterdayKey(new Date(`${today}T12:00:00Z`))) return current + 1;
  return 1;
}
