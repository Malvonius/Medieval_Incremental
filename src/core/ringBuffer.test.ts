import { describe, expect, it } from "vitest";
import { RingBuffer } from "./ringBuffer";

describe("RingBuffer", () => {
  it("hält höchstens capacity Werte, älteste zuerst", () => {
    const buffer = new RingBuffer<number>(3);
    for (const n of [1, 2, 3, 4, 5]) buffer.push(n);
    expect(buffer.length).toBe(3);
    expect(buffer.toArray()).toEqual([3, 4, 5]);
  });

  it("lehnt ungültige Kapazität ab", () => {
    expect(() => new RingBuffer(0)).toThrow(RangeError);
  });
});
