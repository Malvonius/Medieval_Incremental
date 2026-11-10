export interface LoopOptions {
  /** Länge eines Simulationsschritts in Sekunden. */
  readonly tickSeconds: number;
  /** Lücken über dieser Schwelle (z. B. inaktiver Tab) gehen an `onGap` statt in die Tick-Schleife. */
  readonly gapThresholdSeconds: number;
  readonly tick: (dt: number) => void;
  readonly onGap: (seconds: number) => void;
  /** Wird nach jedem Frame aufgerufen, in dem mindestens ein Tick lief. */
  readonly render: () => void;
}

export interface FrameScheduler {
  now(): number;
  request(callback: (time: number) => void): number;
  cancel(handle: number): void;
}

export const browserScheduler: FrameScheduler = {
  now: () => performance.now(),
  request: (cb) => requestAnimationFrame(cb),
  cancel: (handle) => cancelAnimationFrame(handle),
};

/**
 * Fixed-Timestep-Loop: Die Simulation läuft unabhängig von der Bildrate
 * in festen Schritten, die Darstellung folgt requestAnimationFrame.
 */
export function startLoop(options: LoopOptions, scheduler: FrameScheduler = browserScheduler): () => void {
  const { tickSeconds, gapThresholdSeconds } = options;
  if (!(tickSeconds > 0)) throw new RangeError(`tickSeconds muss > 0 sein, war ${tickSeconds}`);
  if (!(gapThresholdSeconds > tickSeconds)) throw new RangeError("gapThresholdSeconds muss größer als tickSeconds sein");

  const tickMs = tickSeconds * 1000;
  const gapMs = gapThresholdSeconds * 1000;
  let accumulator = 0;
  let last = scheduler.now();
  let handle = 0;
  let running = true;

  const frame = (now: number): void => {
    if (!running) return;
    const delta = Math.max(0, now - last);
    last = now;

    if (delta > gapMs) {
      options.onGap(delta / 1000);
      options.render();
    } else {
      accumulator += delta;
      let ticked = false;
      while (accumulator >= tickMs) {
        options.tick(tickSeconds);
        accumulator -= tickMs;
        ticked = true;
      }
      if (ticked) options.render();
    }
    handle = scheduler.request(frame);
  };

  handle = scheduler.request(frame);
  return () => {
    running = false;
    scheduler.cancel(handle);
  };
}
