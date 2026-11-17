import { describe, expect, it } from "vitest";
import { joinQrParts, splitForQr } from "./saveTransfer";

describe("QR-Teile", () => {
  it("zerlegt und setzt in beliebiger Reihenfolge wieder zusammen", () => {
    const text = "x".repeat(3500) + "ende";
    const parts = splitForQr(text);
    expect(parts.length).toBe(3);
    expect(joinQrParts([...parts].reverse())).toBe(text);
  });

  it("erkennt fehlende Teile und akzeptiert einen einzelnen Text ohne Kopf", () => {
    const parts = splitForQr("a".repeat(2500));
    expect(joinQrParts(parts.slice(1))).toBeNull();
    expect(joinQrParts(["klartext"])).toBe("klartext");
  });
});
