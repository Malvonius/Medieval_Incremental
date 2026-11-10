import { get } from "svelte/store";
import { tx } from "../i18n";
import { loc } from "../i18n/content";
import type { Completion } from "../game/simulation";
import { settings } from "./settings";

/** Text einer Fertig-Meldung in der aktiven Sprache. Rein, damit testbar. */
export function completionText(completion: Completion): { title: string; body: string } {
  const t = get(tx);
  const l = get(loc);
  switch (completion.kind) {
    case "expedition":
      return { title: t("Expedition zurück"), body: l.expedition(completion.id).name };
    case "research":
      return { title: t("Forschung abgeschlossen"), body: l.research(completion.id).name };
    case "battle":
      return { title: t("Welle abgewehrt"), body: l.wave(completion.wave) };
  }
}

const supported = (): boolean => typeof window !== "undefined" && "Notification" in window;

/** Fragt die Erlaubnis an; gibt zurück, ob Benachrichtigungen nun erlaubt sind. */
export async function requestNotifications(): Promise<boolean> {
  if (!supported()) return false;
  if (Notification.permission === "granted") return true;
  return (await Notification.requestPermission()) === "granted";
}

/** Meldet nur, wenn der Tab im Hintergrund liegt, der Spieler zugestimmt hat und es eingeschaltet ist. */
export function notifyCompletion(completion: Completion): void {
  if (!supported() || !document.hidden || Notification.permission !== "granted" || !get(settings).notifications) return;
  const { title, body } = completionText(completion);
  try {
    new Notification(title, { body, icon: "./icon.svg", tag: `vhal-${completion.kind}` });
  } catch (error) {
    // Manche Browser (z. B. Android) erlauben Notification() nur aus einem Service Worker.
    console.warn("Benachrichtigung nicht möglich", error);
  }
}
