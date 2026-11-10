import { ZERO } from "../core/decimal";
import { type DeepReadonly, type Result, OK, fail, recordFrom } from "../core/types";
import { ASH_EXPONENT, ASH_GOLD_BASE, BUILDING_IDS, FORTIFICATION_IDS, UPGRADE_IDS } from "../content/balance";
import { RESOURCE_IDS } from "../content/ids";
import type { GameState } from "./state";

type View = DeepReadonly<GameState>;

/** Asche, die ein Ritual jetzt bringen würde. Wurzelförmig: doppelter Lauf ≠ doppelte Asche. */
export function ashGain(state: View): number {
  const ratio = state.runTotals.gold.div(ASH_GOLD_BASE);
  if (ratio.lt(1)) return 0;
  return Math.floor(10 ** (ratio.log10() * ASH_EXPONENT));
}

/** Gold dieses Laufs, ab dem das Ritual eine weitere Asche bringt. */
export function goldForNextAsh(state: View): number {
  const next = ashGain(state) + 1;
  return ASH_GOLD_BASE * next ** (1 / ASH_EXPONENT);
}

/**
 * Das Feuer nimmt alles, was in Vhal steht: Ressourcen (außer Glauben), Gebäude, Upgrades,
 * Truppen, Gefangene, Befestigungen und laufende Arbeiten (auch eine Schlacht). Es lässt Story,
 * Forschung, Siegel, Hinweise, Gelübde, Glauben, Asche, abgewehrte Wellen und die Gefallenen
 * in der Krypta unberührt – sonst versiegte nach dem Ritual jede Quelle für Seelen.
 */
export function performRitual(state: GameState): Result {
  if (!state.tiles.ritual) return fail("Du kennst das Ritual noch nicht.");
  const gain = ashGain(state);
  if (gain < 1) return fail("Das Feuer hätte nichts zu verzehren. Sammle mehr Gold.");

  const faith = state.resources.faith;
  state.resources = recordFrom(RESOURCE_IDS, () => ZERO);
  state.resources.faith = faith;
  state.runTotals = recordFrom(RESOURCE_IDS, () => ZERO);
  state.buildings = recordFrom(BUILDING_IDS, () => 0);
  state.upgrades = recordFrom(UPGRADE_IDS, () => false);
  state.forge = { queue: [], progress: 0 };
  state.warroom.soldiers = 0;
  state.warroom.active = [];
  state.dungeon.prisoners = 0;
  state.dungeon.laborers = 0;
  state.alchemy.active = null;
  state.siege.fortifications = recordFrom(FORTIFICATION_IDS, () => 0);
  state.siege.battle = null;

  state.ritual.ash += gain;
  state.ritual.performed += 1;
  return OK;
}
