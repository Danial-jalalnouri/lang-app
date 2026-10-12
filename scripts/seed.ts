/**
 * Idempotent seeder: loads src/content into Postgres (Neon).
 *   npm run seed            apply changes
 *   npm run seed:dry        show what would change without writing
 * Never touches progress tables — learner data survives re-seeds.
 */
import { query, ensureSchema, withTransaction, getPool } from "../src/db/client";
import { levelA1 } from "../src/content/a1";
import type { Exercise, LessonContent } from "../src/content/types";

const DRY = process.argv.includes("--dry-run");
const level = levelA1;
const units = level.units;
const lessons = units.flatMap((u) => u.lessons);

function exerciseColumns(ex: Exercise, lessonId: string, order: number): unknown[] {
  const payload: Record<string, unknown> = {};
  const answer: Record<string, unknown> = {};
  switch (ex.type) {
    case "mcq":
      payload.question = ex.question;
      payload.options = ex.options;
      if (ex.explanation) payload.explanation = ex.explanation;
      answer.answerIndex = ex.answerIndex;
      break;
    case "translate":
      payload.direction = ex.direction;
      payload.source = ex.source;
      answer.target = ex.target;
      answer.accepted = ex.accepted ?? [];
      break;
    case "typing":
      payload.question = ex.question;
      if (ex.hint) payload.hint = ex.hint;
      answer.answer = ex.answer;
      answer.accepted = ex.accepted ?? [];
      break;
    case "fill_blank":
      payload.sentence = ex.sentence;
      if (ex.hint) payload.hint = ex.hint;
      answer.answer = ex.answer;
      answer.accepted = ex.accepted ?? [];
      break;
    case "listen":
      payload.audioText = ex.audioText;
      answer.answer = ex.answer;
      answer.accepted = ex.accepted ?? [];
      break;
    case "flashcard":
      payload.front = ex.front;
      payload.back = ex.back;
      if (ex.vocabId) payload.vocabId = ex.vocabId;
      break;
  }
  return [ex.id, lessonId, ex.type, ex.prompt, JSON.stringify(payload), JSON.stringify(answer), order];
}

// ---- desired rows (column order matches schema.sql) ----
const levelRow: unknown[] = [level.id, level.code, level.name, 1];
const unitRows: unknown[][] = units.map((u, i) => [u.id, level.id, u.slug, u.titleEn, u.descriptionEn, i]);
const lessonRows: unknown[][] = [];
const vocabRows: unknown[][] = [];
const grammarRows: unknown[][] = [];
const exerciseRows: unknown[][] = [];

for (const unit of units) {
  unit.lessons.forEach((lesson: LessonContent, li) => {
    lessonRows.push([lesson.id, unit.id, lesson.slug, lesson.titleEn, lesson.grammarSummaryEn, li]);
    for (const v of lesson.vocabulary) {
      vocabRows.push([
        v.id, unit.id, lesson.id, v.german, v.english, v.article ?? null, v.plural ?? null,
        v.phonetic ?? null, v.exampleDe ?? null, v.exampleEn ?? null, JSON.stringify(v.tags ?? []),
      ]);
    }
    lesson.grammarRules.forEach((g, gi) => {
      grammarRows.push([g.id, lesson.id, g.titleEn, g.ruleEn, g.explanationEn, JSON.stringify(g.examples), gi]);
    });
    lesson.exercises.forEach((ex, ei) => {
      exerciseRows.push(exerciseColumns(ex, lesson.id, ei));
    });
  });
}

const content = {
  levels: [levelRow],
  units: unitRows,
  lessons: lessonRows,
  vocabulary: vocabRows,
  grammar_rules: grammarRows,
  exercises: exerciseRows,
};
type Table = keyof typeof content;

function upsertSql(table: Table, cols: string): string {
  const names = cols.split(",").map((x) => x.trim());
  const placeholders = names.map((_, i) => `$${i + 1}`).join(", ");
  const updates = names.slice(1).map((x) => `${x}=excluded.${x}`).join(", ");
  return `INSERT INTO ${table} (${names.join(", ")}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updates}`;
}

const COLUMNS: Record<Table, string> = {
  levels: "id, code, name, order_index",
  units: "id, level_id, slug, title_en, description_en, order_index",
  lessons: "id, unit_id, slug, title_en, grammar_summary_en, order_index",
  vocabulary: "id, unit_id, lesson_id, german, english, article, plural, phonetic, example_de, example_en, tags",
  grammar_rules: "id, lesson_id, title_en, rule_en, explanation_en, examples, order_index",
  exercises: "id, lesson_id, type, prompt, payload, answer, order_index",
};

type Exec = (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;

/** Existing row ids that belong to this level's scope (so we only delete our own orphans). */
async function scopedIds(table: Table, exec: Exec): Promise<Set<string>> {
  let rows: Record<string, unknown>[];
  switch (table) {
    case "levels":
      return new Set([level.id]);
    case "units":
      rows = (await exec(`SELECT id FROM units WHERE level_id = $1`, [level.id])).rows;
      break;
    case "lessons":
      rows = (await exec(`SELECT l.id FROM lessons l JOIN units u ON u.id = l.unit_id WHERE u.level_id = $1`, [level.id])).rows;
      break;
    case "vocabulary":
      rows = (await exec(`SELECT v.id FROM vocabulary v JOIN units u ON u.id = v.unit_id WHERE u.level_id = $1`, [level.id])).rows;
      break;
    case "grammar_rules":
      rows = (await exec(`SELECT g.id FROM grammar_rules g JOIN lessons l ON l.id = g.lesson_id JOIN units u ON u.id = l.unit_id WHERE u.level_id = $1`, [level.id])).rows;
      break;
    case "exercises":
      rows = (await exec(`SELECT e.id FROM exercises e JOIN lessons l ON l.id = e.lesson_id JOIN units u ON u.id = l.unit_id WHERE u.level_id = $1`, [level.id])).rows;
      break;
  }
  return new Set(rows!.map((r) => String(r.id)));
}

function fp(values: unknown[]): string {
  return JSON.stringify(values);
}

async function main() {
  await ensureSchema();

  if (DRY) {
    console.log("\nDRY RUN — no changes written\n");
    console.log("table            +insert  ~update  =same  -delete");
    for (const table of Object.keys(content) as Table[]) {
      const rows = await query<Record<string, unknown>>(`SELECT * FROM ${table}`);
      const existing = new Map<string, string>();
      for (const r of rows) {
        existing.set(String(r.id), fp(Object.keys(r).filter((k) => k !== "id").map((k) => r[k])));
      }
      const scope = await scopedIds(table, async (sql, params) => ({
        rows: await query<Record<string, unknown>>(sql, params),
      }));
      let ins = 0, upd = 0, same = 0;
      const keep = new Set<string>();
      for (const row of content[table]) {
        const id = String(row[0]);
        keep.add(id);
        const prev = existing.get(id);
        if (prev === undefined) ins++;
        else if (prev !== fp(row.slice(1))) upd++;
        else same++;
      }
      const del = [...scope].filter((id) => !keep.has(id));
      console.log(
        `${table.padEnd(16)} ${String(ins).padStart(6)}  ${String(upd).padStart(7)}  ${String(same).padStart(5)}  ${String(del).padStart(7)}`,
      );
    }
    console.log("");
    return;
  }

  await withTransaction(async (c) => {
    for (const table of Object.keys(content) as Table[]) {
      const sql = upsertSql(table, COLUMNS[table]);
      for (const row of content[table]) {
        await c.query(sql, row);
      }
    }

    // Delete rows that no longer exist in source content (scoped to this level).
    for (const table of ["exercises", "grammar_rules", "vocabulary", "lessons", "units"] as Table[]) {
      const scope = await scopedIds(table, (sql, params) => c.query(sql, params));
      const keep = new Set(content[table].map((r) => String(r[0])));
      const gone = [...scope].filter((id) => !keep.has(id));
      if (gone.length > 0) {
        await c.query(`DELETE FROM ${table} WHERE id = ANY($1)`, [gone]);
      }
    }

    await c.query(
      `INSERT INTO app_meta (key, value) VALUES ('seeded_at', $1)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [new Date().toISOString()],
    );
  });

  console.log(
    `Seeded: ${units.length} units · ${lessons.length} lessons · ` +
      `${lessons.reduce((n, l) => n + l.vocabulary.length, 0)} words · ` +
      `${lessons.reduce((n, l) => n + l.grammarRules.length, 0)} grammar rules · ` +
      `${lessons.reduce((n, l) => n + l.exercises.length, 0)} exercises`,
  );
}

main()
  .then(() => getPool().end())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
