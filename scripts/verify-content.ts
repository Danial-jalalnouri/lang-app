/**
 * Content integrity check (part of `npm run verify`).
 * Fails the process with a non-zero exit code if the A1 content violates
 * structural requirements: unit/lesson counts, word totals, exercise types,
 * id uniqueness, mcq sanity, fill_blank gaps, listen answers, flashcard links.
 */
import { levelA1 } from "../src/content/a1";
import type { Exercise } from "../src/content/types";

const errors: string[] = [];
const err = (msg: string) => errors.push(msg);

const lessons = levelA1.units.flatMap((u) => u.lessons);
const words = lessons.reduce((n, l) => n + l.vocabulary.length, 0);
const exercises = lessons.reduce((n, l) => n + l.exercises.length, 0);

if (levelA1.units.length !== 6) err(`expected 6 units, got ${levelA1.units.length}`);
if (words < 450) err(`expected >=450 words, got ${words}`);
if (exercises < 180) err(`expected >=180 exercises, got ${exercises}`);

const requiredTypes: Exercise["type"][] = ["flashcard", "mcq", "translate", "listen", "typing", "fill_blank"];

// id uniqueness across everything
const seenIds = new Set<string>();
const checkId = (id: string, where: string) => {
  if (seenIds.has(id)) err(`duplicate id "${id}" in ${where}`);
  seenIds.add(id);
};

for (const unit of levelA1.units) {
  checkId(unit.id, `unit ${unit.slug}`);
  if (unit.lessons.length !== 3) err(`unit ${unit.id}: expected 3 lessons, got ${unit.lessons.length}`);
  const unitTypes = new Set<Exercise["type"]>();
  const unitVocabIds = new Set(unit.lessons.flatMap((l) => l.vocabulary.map((v) => v.id)));
  for (const lesson of unit.lessons) {
    checkId(lesson.id, `lesson ${lesson.slug}`);
    if (lesson.grammarRules.length < 3) err(`lesson ${lesson.id}: <3 grammar rules`);
    if (lesson.vocabulary.length < 20) err(`lesson ${lesson.id}: <20 vocab entries`);
    if (lesson.exercises.length < 10) err(`lesson ${lesson.id}: <10 exercises`);

    for (const v of lesson.vocabulary) {
      checkId(v.id, `vocab in ${lesson.id}`);
      if (!v.german || !v.english) err(`vocab ${v.id}: missing german/english`);
      if (v.article && !["der", "die", "das"].includes(v.article)) err(`vocab ${v.id}: bad article "${v.article}"`);
    }
    for (const g of lesson.grammarRules) {
      checkId(g.id, `grammar in ${lesson.id}`);
      if (g.examples.length < 2) err(`grammar ${g.id}: <2 examples`);
    }
    for (const ex of lesson.exercises) {
      checkId(ex.id, `exercise in ${lesson.id}`);
      unitTypes.add(ex.type);
      switch (ex.type) {
        case "mcq":
          if (ex.options.length !== 4) err(`${ex.id}: mcq needs 4 options`);
          if (ex.answerIndex < 0 || ex.answerIndex >= ex.options.length) err(`${ex.id}: bad answerIndex`);
          break;
        case "fill_blank":
          if ((ex.sentence.match(/___/g) ?? []).length !== 1) err(`${ex.id}: needs exactly one ___ gap`);
          if (!ex.answer) err(`${ex.id}: empty answer`);
          break;
        case "listen":
          if (ex.answer !== ex.audioText) err(`${ex.id}: answer must equal audioText`);
          break;
        case "flashcard":
          if (ex.vocabId && !unitVocabIds.has(ex.vocabId)) {
            err(`${ex.id}: flashcard vocabId "${ex.vocabId}" not found in unit`);
          }
          break;
        case "typing":
          if (!ex.answer.trim()) err(`${ex.id}: empty answer`);
          break;
        case "translate":
          if (!ex.target.trim()) err(`${ex.id}: empty target`);
          break;
      }
    }
  }
  for (const t of requiredTypes) {
    if (!unitTypes.has(t)) err(`unit ${unit.id}: missing exercise type "${t}"`);
  }
}

if (errors.length > 0) {
  console.error(`✗ Content check failed (${errors.length} problems):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `✓ Content OK: ${levelA1.units.length} units · ${lessons.length} lessons · ${words} words · ${exercises} exercises`,
);
