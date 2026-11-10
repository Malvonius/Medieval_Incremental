import type { Migration } from "../core/save";

/**
 * Index i migriert Spielstand-Version i+1 → i+2.
 * Bei jeder Schemaänderung: SAVE_VERSION erhöhen und hier eine Migration anhängen.
 */
export const MIGRATIONS: readonly Migration[] = [];
