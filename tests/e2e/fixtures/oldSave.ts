/** Gibt einen Spielstand aus, der vor einer Stunde gespeichert wurde (für E2E-Tests per tsx). */
import { exportSave } from "../../../src/game/persistence";
import { createInitialState } from "../../../src/game/state";

const state = createInitialState(Date.now() - 3600_000);
state.tiles.keep = true;
state.tiles.hall = true;
state.tiles.chronicle = true;
state.flags.act1Complete = true;
state.story.completed.push("a1_inheritance");
state.story.completedAt.push(0);
state.buildings.serf = 20;
process.stdout.write(exportSave(state));
