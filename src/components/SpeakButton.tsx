"use client";

import { useEffect } from "react";
import { speak, speechSupported } from "@/lib/speak";
import { buttonClass } from "@/components/ui";

/** Speaks German text with the browser TTS. No-ops where unsupported. */
export function SpeakButton({
  text,
  label = "Play",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={`Play audio: ${text}`}
      className={buttonClass("subtle", className)}
      onClick={() => {
        if (speechSupported()) speak(text);
      }}
    >
      🔊 {label}
    </button>
  );
}

/** Speaks German text immediately when mounted / when text changes. */
export function AutoSpeak({ text }: { text: string }) {
  useEffect(() => {
    if (text && speechSupported()) speak(text);
  }, [text]);
  return null;
}
