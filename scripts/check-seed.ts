/** Asserts every seeded exercise row parses back into a well-formed exercise. */
import { getDb } from "../src/db/client";

const NEEDS: Record<string, string[]> = {
  typing: ["answer"],
  fill_blank: ["answer"],
  listen: ["answer", "audioText"],
  translate: ["target"],
  mcq: ["answerIndex"],
  flashcard: ["front", "back"],
};

async function main() {
  const db = getDb();
  const r = await db.execute("SELECT id, type, payload, answer FROM exercises");
  let bad = 0;
  for (const row of r.rows) {
    const p = JSON.parse(String(row.payload));
    const a = JSON.parse(String(row.answer));
    for (const k of NEEDS[String(row.type)] ?? []) {
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
  console.log(`✓ all ${r.rows.length} seeded exercises well-formed`);
}
main().catch((e) => { console.error(e); process.exit(1); });
