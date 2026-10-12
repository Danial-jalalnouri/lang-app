import { query, execute, getDb } from "./client";
import type { Exercise, GrammarRule, VocabularyEntry } from "@/content/types";
import { nextBox, nextDueAt, dayKey, updateStreak } from "@/lib/srs";

export const LOCAL_USER = "local";

// ---------- row shapes ----------

interface UnitRow {
  id: string;
  level_id: string;
  slug: string;
  title_en: string;
  description_en: string;
  order_index: number;
}
interface LessonRow {
  id: string;
  unit_id: string;
  slug: string;
  title_en: string;
  grammar_summary_en: string;
  order_index: number;
}
interface VocabRow {
  id: string;
  unit_id: string;
  lesson_id: string | null;
  german: string;
  english: string;
  article: string | null;
  plural: string | null;
  phonetic: string | null;
  example_de: string | null;
  example_en: string | null;
  tags: string;
}
interface GrammarRow {
  id: string;
  lesson_id: string;
  title_en: string;
  rule_en: string;
  explanation_en: string;
  examples: string;
  order_index: number;
}
interface ExerciseRow {
  id: string;
  lesson_id: string;
  type: Exercise["type"];
  prompt: string;
  payload: string;
  answer: string;
  order_index: number;
}

function parseExercise(row: ExerciseRow): Exercise {
  const payload = JSON.parse(row.payload) as Record<string, unknown>;
  const answer = JSON.parse(row.answer) as Record<string, unknown>;
  return { id: row.id, type: row.type, prompt: row.prompt, ...payload, ...answer } as Exercise;
}

function parseVocab(row: VocabRow): VocabularyEntry & { lessonId: string | null; unitId: string } {
  return {
    id: row.id,
    german: row.german,
    english: row.english,
    article: (row.article as VocabularyEntry["article"]) ?? undefined,
    plural: row.plural ?? undefined,
    phonetic: row.phonetic ?? undefined,
    exampleDe: row.example_de ?? undefined,
    exampleEn: row.example_en ?? undefined,
    tags: JSON.parse(row.tags) as string[],
    lessonId: row.lesson_id,
    unitId: row.unit_id,
  };
}

function parseGrammar(row: GrammarRow): GrammarRule {
  return {
    id: row.id,
    titleEn: row.title_en,
    ruleEn: row.rule_en,
    explanationEn: row.explanation_en,
    examples: JSON.parse(row.examples) as { de: string; en: string }[],
  };
}

// Time comes from SQLite, never JS Date: Next.js Cache Components forbids
// unstable JS time APIs on the render/prerender path.
interface NowParts {
  now: string;
  today: string;
  yesterday: string;
}

async function nowParts(): Promise<NowParts> {
  const [r] = await query<NowParts>(
    `SELECT strftime('%Y-%m-%dT%H:%M:%fZ', 'now') AS now,
            strftime('%Y-%m-%d', 'now') AS today,
            strftime('%Y-%m-%d', 'now', '-1 day') AS yesterday`,
  );
  if (!r) throw new Error("database clock unavailable");
  return r;
}

// ---------- read: dashboard ----------

export interface UnitProgress {
  id: string;
  slug: string;
  titleEn: string;
  descriptionEn: string;
  totalLessons: number;
  completedLessons: number;
  totalExercises: number;
  attemptedExercises: number;
  totalWords: number;
  dueWords: number;
}

export interface DashboardData {
  level: { id: string; code: string; name: string };
  streak: number;
  bestStreak: number;
  units: UnitProgress[];
  totalDue: number;
}

export async function getDashboard(): Promise<DashboardData> {
  const [level] = await query<{ id: string; code: string; name: string }>(
    "SELECT id, code, name FROM levels ORDER BY order_index",
  );
  const units = await query<UnitRow>("SELECT * FROM units ORDER BY order_index");
  const state = await getAppState();
  const { now, today, yesterday } = await nowParts();

  const unitProgress: UnitProgress[] = [];
  for (const u of units) {
    const [stats] = await query<{
      total_lessons: number;
      completed_lessons: number;
      total_exercises: number;
      attempted_exercises: number;
      total_words: number;
      due_words: number;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM lessons WHERE unit_id = :id) AS total_lessons,
         (SELECT COUNT(*) FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id
            WHERE l.unit_id = :id AND lp.completed_at IS NOT NULL) AS completed_lessons,
         (SELECT COUNT(*) FROM exercises e JOIN lessons l ON l.id = e.lesson_id
            WHERE l.unit_id = :id) AS total_exercises,
         (SELECT COUNT(*) FROM exercise_progress ep
            JOIN exercises e ON e.id = ep.exercise_id JOIN lessons l ON l.id = e.lesson_id
            WHERE l.unit_id = :id AND ep.correct_count + ep.wrong_count > 0) AS attempted_exercises,
         (SELECT COUNT(*) FROM vocabulary WHERE unit_id = :id) AS total_words,
         (SELECT COUNT(*) FROM vocab_progress vp JOIN vocabulary v ON v.id = vp.vocab_id
            WHERE v.unit_id = :id AND vp.due_at <= :now) AS due_words`,
      { id: u.id, now },
    );
    unitProgress.push({
      id: u.id,
      slug: u.slug,
      titleEn: u.title_en,
      descriptionEn: u.description_en,
      totalLessons: Number(stats?.total_lessons ?? 0),
      completedLessons: Number(stats?.completed_lessons ?? 0),
      totalExercises: Number(stats?.total_exercises ?? 0),
      attemptedExercises: Number(stats?.attempted_exercises ?? 0),
      totalWords: Number(stats?.total_words ?? 0),
      dueWords: Number(stats?.due_words ?? 0),
    });
  }

  const [due] = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM vocab_progress WHERE user_key = ? AND due_at <= ?`,
    [LOCAL_USER, now],
  );

  const lastDay = state.streak_last_day ?? null;
  const streakActive = lastDay === today || lastDay === yesterday;

  return {
    level: level ?? { id: "a1", code: "A1", name: "A1 — Beginner" },
    streak: streakActive ? Number(state.streak_current ?? 0) : 0,
    bestStreak: Number(state.streak_best ?? 0),
    units: unitProgress,
    totalDue: Number(due?.n ?? 0),
  };
}

// ---------- read: unit ----------

export interface LessonSummary {
  lesson: { id: string; slug: string; titleEn: string; grammarSummaryEn: string };
  completed: boolean;
  score: number;
  attemptedExercises: number;
  totalExercises: number;
  totalWords: number;
}

export interface UnitDetail {
  unit: { id: string; slug: string; titleEn: string; descriptionEn: string; levelCode: string };
  lessons: LessonSummary[];
}

export async function getUnit(slug: string): Promise<UnitDetail | null> {
  const [unit] = await query<UnitRow & { level_code: string }>(
    `SELECT u.*, l.code AS level_code FROM units u JOIN levels l ON l.id = u.level_id WHERE u.slug = ?`,
    [slug],
  );
  if (!unit) return null;
  const lessons = await query<LessonRow>("SELECT * FROM lessons WHERE unit_id = ? ORDER BY order_index", [unit.id]);
  const summaries: LessonSummary[] = [];
  for (const l of lessons) {
    const [stats] = await query<{ total_exercises: number; attempted: number; total_words: number }>(
      `SELECT
         (SELECT COUNT(*) FROM exercises WHERE lesson_id = :id) AS total_exercises,
         (SELECT COUNT(*) FROM exercise_progress WHERE exercise_id IN (SELECT id FROM exercises WHERE lesson_id = :id)
            AND correct_count + wrong_count > 0) AS attempted,
         (SELECT COUNT(*) FROM vocabulary WHERE lesson_id = :id) AS total_words`,
      { id: l.id },
    );
    const [lp] = await query<{ completed_at: string | null; score: number }>(
      `SELECT completed_at, score FROM lesson_progress WHERE user_key = ? AND lesson_id = ?`,
      [LOCAL_USER, l.id],
    );
    summaries.push({
      lesson: { id: l.id, slug: l.slug, titleEn: l.title_en, grammarSummaryEn: l.grammar_summary_en },
      completed: Boolean(lp?.completed_at),
      score: Number(lp?.score ?? 0),
      attemptedExercises: Number(stats?.attempted ?? 0),
      totalExercises: Number(stats?.total_exercises ?? 0),
      totalWords: Number(stats?.total_words ?? 0),
    });
  }
  return {
    unit: {
      id: unit.id,
      slug: unit.slug,
      titleEn: unit.title_en,
      descriptionEn: unit.description_en,
      levelCode: unit.level_code,
    },
    lessons: summaries,
  };
}

// ---------- read: lesson ----------

export interface LessonDetail {
  unit: { id: string; slug: string; titleEn: string };
  lesson: { id: string; slug: string; titleEn: string; grammarSummaryEn: string };
  grammarRules: GrammarRule[];
  vocabulary: VocabularyEntry[];
  exercises: Exercise[];
  exerciseTotal: number;
  exerciseAttempted: number;
  completed: boolean;
  score: number;
}

export async function getLesson(id: string): Promise<LessonDetail | null> {
  const [lesson] = await query<LessonRow & { unit_slug: string; unit_title: string }>(
    `SELECT l.*, u.slug AS unit_slug, u.title_en AS unit_title
     FROM lessons l JOIN units u ON u.id = l.unit_id WHERE l.id = ? OR l.slug = ?`,
    [id, id],
  );
  if (!lesson) return null;
  const grammar = await query<GrammarRow>("SELECT * FROM grammar_rules WHERE lesson_id = ? ORDER BY order_index", [lesson.id]);
  const vocab = await query<VocabRow>("SELECT * FROM vocabulary WHERE lesson_id = ? ORDER BY id", [lesson.id]);
  const exercises = await query<ExerciseRow>("SELECT * FROM exercises WHERE lesson_id = ? ORDER BY order_index", [lesson.id]);
  const [attempted] = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM exercise_progress
     WHERE exercise_id IN (SELECT id FROM exercises WHERE lesson_id = ?) AND correct_count + wrong_count > 0`,
    [lesson.id],
  );
  const [lp] = await query<{ completed_at: string | null; score: number }>(
    `SELECT completed_at, score FROM lesson_progress WHERE user_key = ? AND lesson_id = ?`,
    [LOCAL_USER, lesson.id],
  );
  return {
    unit: { id: lesson.unit_id, slug: lesson.unit_slug, titleEn: lesson.unit_title },
    lesson: { id: lesson.id, slug: lesson.slug, titleEn: lesson.title_en, grammarSummaryEn: lesson.grammar_summary_en },
    grammarRules: grammar.map(parseGrammar),
    vocabulary: vocab.map(parseVocab),
    exercises: exercises.map(parseExercise),
    exerciseTotal: exercises.length,
    exerciseAttempted: Number(attempted?.n ?? 0),
    completed: Boolean(lp?.completed_at),
    score: Number(lp?.score ?? 0),
  };
}

export async function getUnitExercises(unitId: string): Promise<{ unit: { id: string; slug: string; titleEn: string }; exercises: Exercise[] } | null> {
  const [unit] = await query<UnitRow>("SELECT * FROM units WHERE id = ?", [unitId]);
  if (!unit) return null;
  const rows = await query<ExerciseRow>(
    `SELECT e.* FROM exercises e JOIN lessons l ON l.id = e.lesson_id
     WHERE l.unit_id = ? ORDER BY l.order_index, e.order_index`,
    [unitId],
  );
  return { unit: { id: unit.id, slug: unit.slug, titleEn: unit.title_en }, exercises: rows.map(parseExercise) };
}

// ---------- read: review ----------

export interface ReviewWord {
  id: string;
  german: string;
  english: string;
  article?: string;
  plural?: string;
  exampleDe?: string;
  exampleEn?: string;
  unitId: string;
}

function toReviewWord(v: ReturnType<typeof parseVocab>): ReviewWord {
  return {
    id: v.id,
    german: v.german,
    english: v.english,
    article: v.article,
    plural: v.plural,
    exampleDe: v.exampleDe,
    exampleEn: v.exampleEn,
    unitId: v.unitId,
  };
}

export async function getDueWords(limit = 30): Promise<ReviewWord[]> {
  const rows = await query<VocabRow>(
    `SELECT v.* FROM vocab_progress vp JOIN vocabulary v ON v.id = vp.vocab_id
     WHERE vp.user_key = ? AND vp.due_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     ORDER BY vp.due_at LIMIT ?`,
    [LOCAL_USER, limit],
  );
  return rows.map((r) => toReviewWord(parseVocab(r)));
}

/** Unseen words — the "learn new words" queue. */
export async function getNewWords(limit = 20): Promise<ReviewWord[]> {
  const rows = await query<VocabRow>(
    `SELECT v.* FROM vocabulary v
     WHERE NOT EXISTS (SELECT 1 FROM vocab_progress vp WHERE vp.vocab_id = v.id AND vp.user_key = ?)
     ORDER BY v.unit_id, v.lesson_id, v.id LIMIT ?`,
    [LOCAL_USER, limit],
  );
  return rows.map((r) => toReviewWord(parseVocab(r)));
}

export interface ReviewStats {
  due: number;
  newWords: number;
  learned: number;
  mastered: number;
}

export async function getReviewStats(): Promise<ReviewStats> {
  const [due] = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM vocab_progress
     WHERE user_key = ? AND due_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    [LOCAL_USER],
  );
  const [fresh] = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM vocabulary v
     WHERE NOT EXISTS (SELECT 1 FROM vocab_progress vp WHERE vp.vocab_id = v.id AND vp.user_key = ?)`,
    [LOCAL_USER],
  );
  const [learned] = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM vocab_progress WHERE user_key = ?`, [LOCAL_USER],
  );
  const [mastered] = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM vocab_progress WHERE user_key = ? AND box >= 4`, [LOCAL_USER],
  );
  return {
    due: Number(due?.n ?? 0),
    newWords: Number(fresh?.n ?? 0),
    learned: Number(learned?.n ?? 0),
    mastered: Number(mastered?.n ?? 0),
  };
}

// ---------- app state (streak etc.) ----------

async function getAppState(): Promise<Record<string, string>> {
  const rows = await query<{ key: string; value: string }>("SELECT key, value FROM app_meta");
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

async function touchStreak(): Promise<void> {
  const state = await getAppState();
  const current = Number(state.streak_current ?? 0);
  const last = state.streak_last_day ?? null;
  const next = updateStreak(current, last);
  const best = Math.max(Number(state.streak_best ?? 0), next);
  const today = dayKey();
  await getDb().batch(
    [
      { sql: `INSERT INTO app_meta (key, value) VALUES ('streak_current', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, args: [String(next)] },
      { sql: `INSERT INTO app_meta (key, value) VALUES ('streak_last_day', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, args: [today] },
      { sql: `INSERT INTO app_meta (key, value) VALUES ('streak_best', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, args: [String(best)] },
    ],
    "write",
  );
}

// ---------- write: progress ----------

export async function recordExerciseResult(exerciseId: string, correct: boolean): Promise<void> {
  await execute(
    `INSERT INTO exercise_progress (user_key, exercise_id, correct_count, wrong_count, streak, last_result, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_key, exercise_id) DO UPDATE SET
       correct_count = correct_count + excluded.correct_count,
       wrong_count = wrong_count + excluded.wrong_count,
       streak = CASE WHEN excluded.last_result = 1 THEN streak + 1 ELSE 0 END,
       last_result = excluded.last_result,
       last_seen_at = excluded.last_seen_at`,
    [LOCAL_USER, exerciseId, correct ? 1 : 0, correct ? 0 : 1, correct ? 1 : 0, correct ? 1 : 0, new Date().toISOString()],
  );
  await touchStreak();
}

export async function recordVocabReview(vocabId: string, remembered: boolean): Promise<void> {
  const [existing] = await query<{ box: number }>(
    `SELECT box FROM vocab_progress WHERE user_key = ? AND vocab_id = ?`,
    [LOCAL_USER, vocabId],
  );
  const newBox = nextBox(Number(existing?.box ?? 0), remembered);
  await execute(
    `INSERT INTO vocab_progress (user_key, vocab_id, box, correct_count, wrong_count, due_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_key, vocab_id) DO UPDATE SET
       box = excluded.box,
       correct_count = vocab_progress.correct_count + excluded.correct_count,
       wrong_count = vocab_progress.wrong_count + excluded.wrong_count,
       due_at = excluded.due_at,
       last_seen_at = excluded.last_seen_at`,
    [
      LOCAL_USER, vocabId, newBox,
      remembered ? 1 : 0, remembered ? 0 : 1,
      nextDueAt(newBox), new Date().toISOString(),
    ],
  );
  await touchStreak();
}

export async function recordLessonCompletion(lessonId: string, score: number): Promise<void> {
  await execute(
    `INSERT INTO lesson_progress (user_key, lesson_id, completed_at, score, attempts)
     VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(user_key, lesson_id) DO UPDATE SET
       completed_at = COALESCE(excluded.completed_at, lesson_progress.completed_at),
       score = MAX(lesson_progress.score, excluded.score),
       attempts = lesson_progress.attempts + 1`,
    [LOCAL_USER, lessonId, new Date().toISOString(), score],
  );
  await touchStreak();
}

export async function resetProgress(): Promise<void> {
  await getDb().batch(
    [
      { sql: `DELETE FROM exercise_progress WHERE user_key = ?`, args: [LOCAL_USER] },
      { sql: `DELETE FROM vocab_progress WHERE user_key = ?`, args: [LOCAL_USER] },
      { sql: `DELETE FROM lesson_progress WHERE user_key = ?`, args: [LOCAL_USER] },
      { sql: `DELETE FROM app_meta WHERE key LIKE 'streak%'`, args: [] },
    ],
    "write",
  );
}
