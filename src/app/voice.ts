import type { Locale } from "../i18n";

/**
 * Vorlesen von Story-Szenen mit der Web Speech API – ohne Audiodateien, die Stimmen liefert
 * das Betriebssystem. Sprecher werden über Tonhöhe und Tempo unterschieden.
 */
const SPEAKERS: Readonly<Record<string, { readonly pitch: number; readonly rate: number }>> = {
  narrator: { pitch: 0.9, rate: 0.95 },
  brannoc: { pitch: 0.6, rate: 0.85 },
  sera: { pitch: 1.15, rate: 1 },
  ilse: { pitch: 1.3, rate: 1.05 },
  bishop: { pitch: 0.5, rate: 0.8 },
};

export const voiceSupported = (): boolean => typeof speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined";

function pickVoice(lang: Locale): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  return voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ?? null;
}

/** Liest die Absätze nacheinander vor; ein neuer Aufruf bricht die laufende Szene ab. */
export function speak(paragraphs: readonly string[], lang: Locale, speaker = "narrator"): void {
  if (!voiceSupported()) return;
  speechSynthesis.cancel();
  const style = SPEAKERS[speaker] ?? SPEAKERS["narrator"];
  const voice = pickVoice(lang);
  for (const text of paragraphs) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "en" ? "en-GB" : "de-DE";
    if (voice) utterance.voice = voice;
    utterance.pitch = style?.pitch ?? 1;
    utterance.rate = style?.rate ?? 1;
    speechSynthesis.speak(utterance);
  }
}

export function stopSpeaking(): void {
  if (voiceSupported()) speechSynthesis.cancel();
}
