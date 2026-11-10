export const RESOURCE_IDS = ["gold", "iron", "swords", "souls", "faith"] as const;
export type ResourceId = (typeof RESOURCE_IDS)[number];

/** Reihenfolge = Anordnung der Kacheln im Menü. */
export const TILE_IDS = [
  "keep",
  "forge",
  "warroom",
  "dungeon",
  "crypt",
  "alchemy",
  "chapel",
  "ritual",
  "chronicle",
] as const;
export type TileId = (typeof TILE_IDS)[number];

export const FLAG_IDS = ["act1Complete", "outpostKnown", "komtureiKnown", "act2Complete", "act3Complete", "act4Complete"] as const;
export type FlagId = (typeof FLAG_IDS)[number];
