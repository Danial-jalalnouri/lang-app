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

## Deployments & databases

Each deployed environment gets its **own Neon branch** (a copy-on-write clone of
production), so a preview can never read or write production data.

| Environment | Who deploys | Database |
|---|---|---|
| Production (`main`) | Vercel's native Git integration | Neon `production` branch |
| Preview (any other branch) | `.github/workflows/neon-preview.yml` | Neon `preview/<git-branch>` branch |

**How a preview works** — on every push to a non-`main` branch the workflow:

1. creates (or reuses) the Neon branch `preview/<git-branch>` from `production`,
   with a compute endpoint and a 7-day expiry;
2. points `DATABASE_URL`, `DATABASE_URL_UNPOOLED` and `NEON_BRANCH` at that branch
   using **branch-scoped Vercel env vars** (`target=preview`, `gitBranch=<branch>`);
3. creates the Vercel preview deployment from the pushed commit.

Vercel's native preview deployments are **disabled** for this project
(`previewDeploymentsDisabled`), so the workflow is the single deployer for previews
and each push produces exactly one deployment. Production is untouched: the
project-level `DATABASE_URL` / `DATABASE_URL_UNPOOLED` / `NEON_BRANCH` target
`production` only, so a preview without its branch-scoped vars has no database at
all rather than production's.

**Cleanup** — `.github/workflows/neon-preview-cleanup.yml` deletes the Neon branch and
the branch-scoped env vars when the git branch is deleted or the PR is closed.
Branches also auto-expire after 7 days.

**Required repository configuration** (already set for `lang-app`):

- Secrets: `NEON_API_KEY` (project-scoped Neon key), `VERCEL_TOKEN`
- Variables: `NEON_PROJECT_ID`, `NEON_PARENT_BRANCH_ID`, `NEON_DATABASE_NAME`,
  `NEON_ROLE_NAME`, `NEON_REGION_ID`, `NEON_BRANCH_TTL_DAYS`, `VERCEL_PROJECT_ID`,
  `VERCEL_TEAM_ID`, `VERCEL_ORG`, `VERCEL_REPO`, `VERCEL_PROJECT_NAME`

**Caveats**

- Pull requests from forks are skipped — Vercel env vars cannot be scoped to a
  branch that does not exist in the connected repository.
- The Neon Marketplace integration is *not* used for this project; the workflow
  owns branch provisioning. Do not connect it here as well or both would set
  `DATABASE_URL`.
- `VERCEL_TOKEN` is currently a personal Vercel token. Swap it for a
  project-scoped token (Vercel → Settings → Tokens) if you want tighter scoping.

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
