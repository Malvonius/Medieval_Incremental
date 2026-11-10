import { describe, expect, it } from "vitest";
import { type AsyncKeyValue, MirroredStorage } from "./backupStorage";

const memory = () => {
  const map = new Map<string, string>();
  return { map, getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), removeItem: (k: string) => void map.delete(k) };
};
const asyncMemory = (): AsyncKeyValue & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return { map, get: async (k) => map.get(k) ?? null, set: async (k, v) => void map.set(k, v), delete: async (k) => void map.delete(k) };
};

describe("MirroredStorage", () => {
  it("schreibt in beide Speicher", async () => {
    const primary = memory();
    const mirror = asyncMemory();
    new MirroredStorage(primary, mirror).setItem("a", "1");
    await Promise.resolve();
    expect(primary.map.get("a")).toBe("1");
    expect(mirror.map.get("a")).toBe("1");
  });

  it("stellt einen verlorenen Spielstand aus dem Backup wieder her, überschreibt aber keinen vorhandenen", async () => {
    const primary = memory();
    const mirror = asyncMemory();
    mirror.map.set("lost", "backup");
    mirror.map.set("kept", "alt");
    primary.map.set("kept", "neu");
    await MirroredStorage.restore(primary, mirror, ["lost", "kept"]);
    expect(primary.map.get("lost")).toBe("backup");
    expect(primary.map.get("kept")).toBe("neu");
  });
});
