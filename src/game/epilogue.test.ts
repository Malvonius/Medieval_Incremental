import { describe, expect, it } from "vitest";
import json from "../content/ink/epilog.ink";
import jsonEn from "../content/ink/epilog.en.ink";
import { Epilogue } from "./epilogue";
import { createInitialState } from "./state";

const play = (mutate: (s: ReturnType<typeof createInitialState>) => void, choice: number): string => {
  const state = createInitialState(0);
  mutate(state);
  const epilogue = new Epilogue(json, state);
  const first = epilogue.next();
  expect(first.choices).toHaveLength(2);
  const last = epilogue.choose(choice);
  expect(last.done).toBe(true);
  return [...first.paragraphs, ...last.paragraphs].join(" ");
};

describe("Ink-Epilog (Englisch)", () => {
  it("hat dieselbe Struktur wie die deutsche Fassung", () => {
    const state = createInitialState(0);
    state.siege.ending = "light";
    state.flags.trustSera = true;
    const epilogue = new Epilogue(jsonEn, state);
    expect(epilogue.next().choices).toEqual(["Visit Brannoc's grave", "Ring the bell one last time"]);
    expect(epilogue.choose(0).paragraphs.join(" ")).toContain("Vhal is free.");
  });
});

describe("Ink-Epilog", () => {
  it("verzweigt nach Ende, Vertrauen und Wahl", () => {
    const light = play((s) => {
      s.siege.ending = "light";
      s.flags.trustSera = true;
    }, 0);
    expect(light).toContain("Sera steht am Tor");
    expect(light).toContain("Hammer");
    expect(light).toContain("Vhal ist frei.");

    const ash = play((s) => {
      s.siege.ending = "ash";
      s.flags.trustIlse = true;
    }, 1);
    expect(ash).toContain("Meister");
    expect(ash).toContain("Osten");
  });

  it("kennt Neues Spiel+", () => {
    const text = play((s) => {
      s.siege.ending = "light";
      s.meta.ngPlus = 2;
    }, 1);
    expect(text).toContain("3-mal");
  });
});
