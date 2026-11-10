import { describe, expect, it } from "vitest";
import { type FrameScheduler, startLoop } from "./loop";

function fakeScheduler() {
  let time = 0;
  let pending: ((t: number) => void) | null = null;
  const scheduler: FrameScheduler = {
    now: () => time,
    request: (cb) => {
      pending = cb;
      return 1;
    },
    cancel: () => {
      pending = null;
    },
  };
  const advance = (ms: number): void => {
    time += ms;
    const cb = pending;
    pending = null;
    cb?.(time);
  };
  return { scheduler, advance };
}

describe("startLoop", () => {
  it("tickt in festen Schritten unabhängig von der Bildrate", () => {
    const { scheduler, advance } = fakeScheduler();
    const ticks: number[] = [];
    startLoop({ tickSeconds: 0.1, gapThresholdSeconds: 2, tick: (dt) => ticks.push(dt), onGap: () => {}, render: () => {} }, scheduler);
    // 40 Frames à 25 ms = exakt 1 s (glatte Werte vermeiden Gleitkomma-Rest im Akkumulator).
    for (let i = 0; i < 40; i += 1) advance(25);
    expect(ticks).toHaveLength(10);
    expect(ticks.every((dt) => dt === 0.1)).toBe(true);
  });

  it("leitet lange Lücken an onGap weiter", () => {
    const { scheduler, advance } = fakeScheduler();
    const gaps: number[] = [];
    let ticks = 0;
    startLoop({ tickSeconds: 0.1, gapThresholdSeconds: 2, tick: () => (ticks += 1), onGap: (s) => gaps.push(s), render: () => {} }, scheduler);
    advance(30_000);
    expect(gaps).toEqual([30]);
    expect(ticks).toBe(0);
  });

  it("stoppt nach dem Abmelden", () => {
    const { scheduler, advance } = fakeScheduler();
    let ticks = 0;
    const stop = startLoop({ tickSeconds: 0.1, gapThresholdSeconds: 2, tick: () => (ticks += 1), onGap: () => {}, render: () => {} }, scheduler);
    stop();
    advance(500);
    expect(ticks).toBe(0);
  });
});
