<script lang="ts">
  import { tx } from "../../i18n";
  import { bi } from "../../i18n/bi";
  import type { GameController, Snapshot } from "../../app/controller";
  import { AUTOMATORS, AUTOMATOR_IDS } from "../../content/extensions";
  import { automatorUnlocked } from "../../game/extensions";

  let { game, snap }: { game: GameController; snap: Snapshot } = $props();

  const percent = $derived(Math.round(snap.state.autobuy.threshold * 100));
</script>

<section class="panel-section">
  <h3 class="section-title">{$tx("Aschen-Automaten")}</h3>
  <p class="hint">{$tx("Jedes Ritual weckt neue Helfer aus der Asche. Sie kaufen, sobald die Kosten unter der Schwelle liegen.")}</p>
  <ul class="list">
    {#each AUTOMATOR_IDS as id (id)}
      {@const unlocked = automatorUnlocked(snap.state, id)}
      <li>
        <label class:locked={!unlocked}>
          <input
            type="checkbox"
            disabled={!unlocked}
            checked={snap.state.autobuy.enabled[id]}
            onchange={(e) => game.dispatch({ type: "setAutomator", automator: id, enabled: e.currentTarget.checked })}
          />
          {$bi(AUTOMATORS[id].name)}
          {#if !unlocked}<span class="req">{$tx("ab {n}. Ritual", { n: String(AUTOMATORS[id].rituals) })}</span>{/if}
        </label>
      </li>
    {/each}
  </ul>
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
</section>

<style>
  .hint,
  .req {
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .hint {
    margin: 0 0 8px;
  }

  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 4px;
  }

  .locked {
    color: var(--text-faint);
  }

  .threshold {
    display: grid;
    gap: 4px;
    margin-top: 8px;
  }
</style>
