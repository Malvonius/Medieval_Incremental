import type { DeepReadonly } from "../core/types";
import { ACHIEVEMENTS, ACHIEVEMENT_BONUS, ACHIEVEMENT_IDS, type AchievementId } from "../content/achievements";
import type { GameState } from "./state";

export const achievementCount = (state: DeepReadonly<GameState>): number =>
  ACHIEVEMENT_IDS.reduce((n, id) => n + (state.achievements[id] ? 1 : 0), 0);

export const achievementMultiplier = (state: DeepReadonly<GameState>): number =>
  1 + achievementCount(state) * ACHIEVEMENT_BONUS;

/** Prüft nur noch nicht erreichte Erfolge und gibt die neu erreichten zurück. */
export function evaluateAchievements(state: GameState): AchievementId[] {
  const earned: AchievementId[] = [];
  for (const id of ACHIEVEMENT_IDS) {
    if (state.achievements[id] || !ACHIEVEMENTS[id].trigger(state)) continue;
    state.achievements[id] = true;
    earned.push(id);
  }
  return earned;
}
