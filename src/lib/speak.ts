"use client";

/** Browser text-to-speech for German (Web Speech API). Degrades silently when unsupported. */

let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  if (cachedVoices.length === 0) cachedVoices = window.speechSynthesis.getVoices();
  return cachedVoices;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    cachedVoices = window.speechSynthesis.getVoices();
  });
}

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function germanVoiceAvailable(): boolean {
  return loadVoices().some((v) => v.lang.toLowerCase().startsWith("de"));
}

export function speak(text: string, rate = 0.9): boolean {
  if (!speechSupported()) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const de = loadVoices().find((v) => v.lang.toLowerCase().startsWith("de"));
  if (de) utterance.voice = de;
  utterance.lang = "de-DE";
  utterance.rate = rate;
  synth.speak(utterance);
  return true;
}
