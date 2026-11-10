import { describe, expect, it } from "vitest";
import { translate } from "./index";

describe("translate", () => {
  it("liefert je Sprache eigene Texte", () => {
    expect(translate("de", "tile.keep")).toBe("Burgfried");
    expect(translate("en", "tile.keep")).toBe("Keep");
  });
});
