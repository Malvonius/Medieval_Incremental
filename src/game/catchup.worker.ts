/// <reference lib="webworker" />
import { catchUp, offlineParams, reportToPlain } from "./offline";
import { type PlainState, fromPlain, toPlain } from "./serialize";
import { Simulation } from "./simulation";
import type { TimelapseRequest, TimelapseResponse } from "./timelapse";

/**
 * Zeitraffer im Hintergrund-Thread: simuliert die Abwesenheit, ohne die Oberfläche zu blockieren,
 * und meldet regelmäßig den Fortschritt. Ergebnis ist der neue Spielstand plus Bericht.
 */
const post = (message: TimelapseResponse): void => self.postMessage(message);

self.onmessage = (event: MessageEvent<TimelapseRequest>): void => {
  try {
    const state = fromPlain(event.data.plain, event.data.now);
    const sim = new Simulation(state);
    const { efficiency, cap } = offlineParams(sim.view);
    const report = catchUp(sim, event.data.awaySeconds, efficiency, cap, (done, total) => post({ type: "progress", done, total }), 300);
    post({ type: "done", plain: toPlain(sim.view) as PlainState, report: reportToPlain(report) });
  } catch (error) {
    post({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
