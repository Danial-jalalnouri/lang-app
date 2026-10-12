/** Asserts every seeded exercise row parses back into a well-formed exercise. */
import { query, getPool } from "../src/db/client";

const NEEDS: Record<string, string[]> = {
  typing: ["answer"],
  fill_blank: ["answer"],
  listen: ["answer", "audioText"],
  translate: ["target"],
  mcq: ["answerIndex"],
  flashcard: ["front", "back"],
};

async function main() {
  const rows = await query<{ id: string; type: string; payload: string; answer: string }>(
    "SELECT id, type, payload, answer FROM exercises",
  );
  let bad = 0;
  for (const row of rows) {
    const p = JSON.parse(row.payload);
    const a = JSON.parse(row.answer);
    for (const k of NEEDS[row.type] ?? []) {
      if (a[k] === undefined && p[k] === undefined) {
        console.log("MISSING", row.type, row.id, k);
        bad++;
      }
    }
  }
  if (bad) {
    console.error(`${bad} malformed exercises`);
    process.exit(1);
  }
  console.log(`✓ all ${rows.length} seeded exercises well-formed`);
}
main()
  .then(() => getPool().end())
  .catch((e) => { console.error(e); process.exit(1); });
