# DeutschStart

A single-user German-learning web app for English speakers — currently the **A1 level**:
vocabulary, grammar (explained in English), listening, typing/translation drills and a
spaced-repetition review queue. No accounts, no payments: progress lives in a
[Neon](https://neon.tech) Postgres database.

## Quick start

```bash
npm install
neon link --project-id square-shadow-01448654 --branch production   # writes .env.local
npm run seed      # load the A1 course into Neon Postgres
npm run dev       # http://localhost:3000
```

Re-running `npm run seed` is always safe: it upserts content, never touches your progress.
Preview changes first with `npm run seed:dry`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run seed` | Idempotent content seed (content → Postgres) |
| `npm run seed:dry` | Show insert/update/delete counts without writing |
| `npm run verify:content` | Structural check of the A1 source content |
| `npm run verify:seed` | Check every seeded exercise row parses back correctly |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

`npm run verify` runs all verification steps.

## Course content (source of truth)

Content lives in version-controlled TypeScript, not in the running database:

```
src/content/
  types.ts               # UnitContent / LessonContent / Exercise contracts
  a1/
    index.ts             # level A1 = the 6 units below
    unit-1-greetings.ts  # …
    unit-2-numbers.ts
    unit-3-family.ts
    unit-4-food.ts
    unit-5-city.ts
    unit-6-travel.ts
```

- 6 units × 3 lessons · ~495 words · 54 grammar rules · 242 exercises
- Exercise types: `mcq`, `translate`, `typing`, `fill_blank`, `listen`, `flashcard`
- Stable IDs (`u4l2-v03`, `u4l2-e07`) — progress references IDs, so edits never lose progress
- To edit content: change the TS file → `npm run seed` → done. New levels later are just
  new folders + one entry in `index.ts`.

## Architecture

- **Next.js 16** (App Router, Cache Components) + TypeScript + Tailwind CSS 4
- **Neon Postgres** via `pg` — `neon link` writes `DATABASE_URL` (pooled) and
  `DATABASE_URL_UNPOOLED` into `.env.local`; the app uses the pooled endpoint, so the same
  code deploys to Vercel as-is
- **Neon branch policy** — `neon.ts` + `neon deploy` manage branch settings; current
  branch is `production` (shown in Settings)
- **Server Functions** (`src/app/actions.ts`) record answers, flashcard reviews, lesson
  completions, the daily streak, and reset progress
- **DB reads** sit behind `await connection()` inside `<Suspense>`: static shell, fresh data
  streamed per request (never baked at build time)
- **Server-side time** — all due-date/streak comparisons use SQL `now()`/`to_char`; JS
  time APIs never run on the render path (Next.js Cache Components requirement)
- **Answer grading** (`src/lib/answer-check.ts`) is lenient: ignores punctuation/case,
  treats `ä=a`, `ö=o`, `ü=u`, `ß=ss` (English keyboards) and allows with/without articles
- **Speech** uses the browser Web Speech API (`de-DE`); no audio files needed
- **SRS** (`src/lib/srs.ts`): Leitner boxes 0–6 → 10 min, 1, 2, 4, 7, 14, 30 days

## Data model

`levels → units → lessons → { vocabulary, grammar_rules, exercises }` (seeded, never
written by the app) and `exercise_progress / vocab_progress / lesson_progress / app_meta`
(runtime-owned; all keyed by `user_key = 'local'`, ready for real users later).
Schema DDL lives in `src/db/schema.sql` and is applied automatically on first query.

## Roadmap (after v1)

1. **A2+ content** — new folders in `src/content`, nothing else changes
2. **Accounts** — promote `user_key` to a real `users` table
3. **Admin UI** — edit content in the app (content already lives in the DB)
