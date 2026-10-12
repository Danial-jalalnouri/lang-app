-- DeutschStart v1 schema (Postgres / Neon)
-- All content tables are seeded from src/content; progress tables are runtime-owned.

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS levels (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  level_id TEXT NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL,
  description_en TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title_en TEXT NOT NULL,
  grammar_summary_en TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL,
  UNIQUE (unit_id, slug)
);

CREATE TABLE IF NOT EXISTS vocabulary (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
  german TEXT NOT NULL,
  english TEXT NOT NULL,
  article TEXT,
  plural TEXT,
  phonetic TEXT,
  example_de TEXT,
  example_en TEXT,
  tags TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS grammar_rules (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title_en TEXT NOT NULL,
  rule_en TEXT NOT NULL,
  explanation_en TEXT NOT NULL DEFAULT '',
  examples TEXT NOT NULL DEFAULT '[]',
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('flashcard', 'mcq', 'translate', 'listen', 'typing', 'fill_blank')),
  prompt TEXT NOT NULL DEFAULT '',
  payload TEXT NOT NULL DEFAULT '{}',
  answer TEXT NOT NULL DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0
);

-- Runtime: single local user for v1; user_key becomes a real FK when auth arrives.
CREATE TABLE IF NOT EXISTS exercise_progress (
  user_key TEXT NOT NULL DEFAULT 'local',
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  last_result INTEGER,
  last_seen_at TIMESTAMPTZ,
  PRIMARY KEY (user_key, exercise_id)
);

CREATE TABLE IF NOT EXISTS vocab_progress (
  user_key TEXT NOT NULL DEFAULT 'local',
  vocab_id TEXT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  box INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  due_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ,
  PRIMARY KEY (user_key, vocab_id)
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  user_key TEXT NOT NULL DEFAULT 'local',
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  score DOUBLE PRECISION NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_key, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_vocabulary_unit ON vocabulary(unit_id);
CREATE INDEX IF NOT EXISTS idx_lessons_unit ON lessons(unit_id);
CREATE INDEX IF NOT EXISTS idx_grammar_lesson ON grammar_rules(lesson_id);
CREATE INDEX IF NOT EXISTS idx_exercises_lesson ON exercises(lesson_id);
CREATE INDEX IF NOT EXISTS idx_vocab_progress_due ON vocab_progress(user_key, due_at);
