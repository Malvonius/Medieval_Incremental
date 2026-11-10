import bishop from "./bishop.svg";
import brannoc from "./brannoc.svg";
import ilse from "./ilse.svg";
import seal from "./seal.svg";
import sera from "./sera.svg";

export const PORTRAITS = { brannoc, sera, ilse, bishop, seal } as const;
export type PortraitId = keyof typeof PORTRAITS;

/** Wer in welchem Story-Abschnitt spricht oder im Mittelpunkt steht. */
const BY_NODE: Readonly<Record<string, PortraitId>> = {
  a1_inheritance: "seal", a1_ledger: "seal", a1_grey_banner: "seal", a2_seal: "seal", a1_memory: "seal",
  a1_smith: "brannoc", a1_first_blade: "brannoc", a1_armory: "brannoc", a2_traitor: "brannoc", a3_descent: "brannoc", a4_ashes: "brannoc", a5_brannoc: "brannoc",
  a2_council: "sera", a2_first_blood: "sera", a2_komturei: "sera", a3_first_souls: "sera", a4_mass: "sera", a5_siege: "sera", a5_first_wave: "sera", a4_rebirth: "sera",
  a3_alchemist: "ilse", a3_first_work: "ilse", a4_vow: "ilse", a4_betrayal: "ilse", a5_ilse: "ilse", a5_end_ash: "ilse", a5_epilogue_ash: "ilse",
  a3_voice: "bishop", a3_glass: "bishop", a3_stone: "bishop", a4_sermon: "bishop", a5_bishop: "bishop", a5_fall: "bishop",
};

export const portraitFor = (nodeId: string): PortraitId | null => BY_NODE[nodeId] ?? null;
