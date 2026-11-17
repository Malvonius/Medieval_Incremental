<script lang="ts">
  import { tx } from "../../i18n";
  import { bi } from "../../i18n/bi";
  import type { GameController, Snapshot } from "../../app/controller";
  import { MAP, MAP_SIZE, MAP_TILE_BONUS, TERRAINS } from "../../content/extensions";
  import { conquestStrength, isBorder } from "../../game/extensions";
  import { formatNumber, formatPercent } from "../format";

  let { game, snap }: { game: GameController; snap: Snapshot } = $props();

  const owned = $derived(new Set(snap.state.map.owned));
</script>

<section class="panel-section">
  <h3 class="section-title">{$tx("Ländereien")} <small class="num">{owned.size}/{MAP.length}</small></h3>
  <p class="hint">
    {$tx("Erobere angrenzende Felder mit deinen Soldaten. Ein Viertel der nötigen Männer fällt. Jedes Feld stärkt seine Ressource um {bonus}.", { bonus: formatPercent(MAP_TILE_BONUS) })}
  </p>
  <div class="map" style:grid-template-columns={`repeat(${MAP_SIZE}, minmax(0, 1fr))`}>
    {#each MAP as terrain, i (i)}
      {@const def = TERRAINS[terrain]}
      {@const mine = owned.has(i)}
      {@const border = isBorder(snap.state, i)}
      {@const need = border ? conquestStrength(snap.state, i) : 0}
      <button
        class="field {terrain}"
        class:owned={mine}
        class:border
        disabled={!border || snap.state.warroom.soldiers < need}
        title={mine ? $bi(def.name) : border ? `${$bi(def.name)} – ${$tx("Erobern")}: ${formatNumber(need)} ${$tx("Soldaten")}` : $tx("Unbekanntes Land")}
        aria-label={mine ? `${$bi(def.name)} (${$tx("dein")})` : border ? `${$bi(def.name)}: ${$tx("Erobern")} ${formatNumber(need)}` : $tx("Unbekanntes Land")}
        onclick={() => game.dispatch({ type: "conquer", index: i })}
      >
        <span class="glyph" aria-hidden="true">{mine || border ? def.glyph : "·"}</span>
        {#if border}<span class="num need">{formatNumber(need)}</span>{/if}
      </button>
    {/each}
  </div>
</section>

<style>
  .hint {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin: 0 0 8px;
  }

  .map {
    display: grid;
    gap: 4px;
    max-width: 320px;
  }

  .field {
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    align-content: center;
    background: #120f0c;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-faint);
    padding: 0;
    font: inherit;
  }

  .field.owned {
    color: var(--gold);
    border-color: var(--gold);
    background: linear-gradient(160deg, #2c241c, #1a140f);
  }

  .field.border:not(:disabled) {
    color: var(--text);
    border-style: dashed;
    border-color: var(--ember);
    cursor: pointer;
  }

  .field.border:disabled {
    color: var(--text-muted);
    border-style: dashed;
  }

  .glyph {
    font-size: 1.2rem;
    line-height: 1;
  }

  .need {
    font-size: 0.65rem;
  }
</style>
