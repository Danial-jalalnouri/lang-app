export type ExerciseType =
  | "flashcard"
  | "mcq"
  | "translate"
  | "listen"
  | "typing"
  | "fill_blank";

export interface VocabularyEntry {
  /** Stable ID, e.g. "u1-l1-hallo" — never changes once shipped. */
  id: string;
  german: string;
  english: string;
  article?: "der" | "die" | "das";
  plural?: string;
  phonetic?: string;
  exampleDe?: string;
  exampleEn?: string;
  tags?: string[];
}

export interface GrammarExample {
  de: string;
  en: string;
}

export interface GrammarRule {
  id: string;
  titleEn: string;
  ruleEn: string;
  explanationEn: string;
  examples: GrammarExample[];
}

interface ExerciseBase {
  /** Stable ID, e.g. "u1-l1-e01". */
  id: string;
  prompt: string;
}

export interface McqExercise extends ExerciseBase {
  type: "mcq";
  question: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
}

export interface TranslateExercise extends ExerciseBase {
  type: "translate";
  direction: "de-en" | "en-de";
  source: string;
  /** Reference translation (first accepted variant). */
  target: string;
  /** Optional extra accepted answers (e.g. without article). */
  accepted?: string[];
}

export interface TypingExercise extends ExerciseBase {
  type: "typing";
  /** English side of the prompt (or the translation direction hint). */
  question: string;
  answer: string;
  /** Extra accepted variants. */
  accepted?: string[];
  hint?: string;
}

export interface FillBlankExercise extends ExerciseBase {
  type: "fill_blank";
  /** Sentence containing "___" for the gap. */
  sentence: string;
  answer: string;
  accepted?: string[];
  hint?: string;
}

export interface ListenExercise extends ExerciseBase {
  type: "listen";
  /** German text spoken by the browser TTS. */
  audioText: string;
  answer: string;
  accepted?: string[];
}

export interface FlashcardExercise extends ExerciseBase {
  type: "flashcard";
  front: string;
  back: string;
  /** Links the card to vocabulary so reviews update SRS progress. */
  vocabId?: string;
}

export type Exercise =
  | McqExercise
  | TranslateExercise
  | TypingExercise
  | FillBlankExercise
  | ListenExercise
  | FlashcardExercise;

export interface LessonContent {
  id: string;
  slug: string;
  titleEn: string;
  grammarSummaryEn: string;
  vocabulary: VocabularyEntry[];
  grammarRules: GrammarRule[];
  exercises: Exercise[];
}

export interface UnitContent {
  id: string;
  slug: string;
  titleEn: string;
  descriptionEn: string;
  lessons: LessonContent[];
}

export interface LevelContent {
  id: string;
  code: string;
  name: string;
  units: UnitContent[];
}
