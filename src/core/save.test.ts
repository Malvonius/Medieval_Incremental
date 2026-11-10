import { compressToBase64 } from "lz-string";
import { describe, expect, it } from "vitest";
import { SaveError, decodeSave, encodeSave, fnv1a } from "./save";

describe("Spielstand-Envelope", () => {
  it("überlebt einen Roundtrip", () => {
    const data = { gold: "1.5e30", list: [1, 2, 3] };
    expect(decodeSave(encodeSave(data, 1), 1, [])).toEqual(data);
  });

  it("erkennt eine falsche Prüfsumme", () => {
    const forged = compressToBase64(JSON.stringify({ version: 1, checksum: "deadbeef", payload: "{}" }));
    expect(() => decodeSave(forged, 1, [])).toThrow(/Prüfsumme/);
  });

  it("lehnt Müll und neuere Versionen ab", () => {
    expect(() => decodeSave("kein spielstand", 1, [])).toThrow(SaveError);
    expect(() => decodeSave(encodeSave({}, 3), 2, [(d) => d])).toThrow(/neueren Version/);
  });

  it("wendet Migrationen der Reihe nach an", () => {
    const text = encodeSave({ a: 1 }, 1);
    const migrated = decodeSave(text, 3, [
      (d) => ({ ...(d as object), b: 2 }),
      (d) => ({ ...(d as object), c: 3 }),
    ]);
    expect(migrated).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("verlangt passende Migrationsanzahl", () => {
    expect(() => decodeSave(encodeSave({}, 1), 2, [])).toThrow(/Migrationen/);
  });

  it("fnv1a ist stabil", () => {
    expect(fnv1a("")).toBe("811c9dc5");
    expect(fnv1a("a")).toBe("e40c292c");
  });
});
