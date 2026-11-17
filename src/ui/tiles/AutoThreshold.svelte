<script lang="ts">
  import { tx } from "../../i18n";
  import type { GameController, Snapshot } from "../../app/controller";

  let { game, snap }: { game: GameController; snap: Snapshot } = $props();

  const percent = $derived(Math.round(snap.state.autobuy.threshold * 100));
</script>

<label class="threshold">
  <span>{$tx("Kaufen, wenn die Kosten höchstens {p} % des Vorrats betragen", { p: String(percent) })}</span>
  <input
    type="range"
    min="1"
    max="100"
    value={percent}
    onchange={(e) => game.dispatch({ type: "setAutoThreshold", threshold: Number(e.currentTarget.value) / 100 })}
  />
</label>

<style>
  .threshold {
    display: grid;
    gap: 4px;
    margin-top: 8px;
  }
</style>
