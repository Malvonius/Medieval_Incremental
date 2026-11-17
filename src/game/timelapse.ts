import type { PlainReport } from "./offline";
import type { PlainState } from "./serialize";

export interface TimelapseRequest {
  readonly plain: PlainState;
  readonly awaySeconds: number;
  readonly now: number;
}

export type TimelapseResponse =
  | { readonly type: "progress"; readonly done: number; readonly total: number }
  | { readonly type: "done"; readonly plain: PlainState; readonly report: PlainReport }
  | { readonly type: "error"; readonly message: string };

/** Startet den Zeitraffer-Worker; null, wenn die Umgebung keine Module-Worker kennt (Tests, alte Browser). */
export function spawnTimelapse(): Worker | null {
  if (typeof Worker === "undefined") return null;
  try {
    return new Worker(new URL("./catchup.worker.ts", import.meta.url), { type: "module" });
  } catch {
    return null;
  }
}
