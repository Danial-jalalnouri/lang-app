/**
 * Answer checking shared by client (instant feedback) and server (verification).
 * Lenient by design: English keyboards lack umlauts, so ä=ö=ü match their base
 * letters and ß=ss; punctuation, capitalization and articles are normalized away.
 */

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFC")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .replace(/[.!?,;:"'„“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripArticle(s: string): string {
  return s.replace(/^(der|die|das|den|dem|der)\s+/, "").trim();
}

/** All normalized variants of an answer string (with and without leading article). */
function variants(input: string): string[] {
  const n = normalize(input);
  const noArticle = normalize(stripArticle(n));
  return noArticle === n ? [n] : [n, noArticle];
}

export function checkAnswer(userInput: string, answer: string, accepted: string[] = []): boolean {
  const candidates = [answer, ...accepted];
  const userVariants = variants(userInput);
  for (const candidate of candidates) {
    for (const cv of variants(candidate)) {
      if (userVariants.includes(cv) && cv.length > 0) return true;
    }
  }
  return false;
}
