<script lang="ts">
  import { tx } from "../../i18n";
  import { bi } from "../../i18n/bi";
  import type { GameController, Snapshot } from "../../app/controller";
  import { STATIONS, STATION_IDS, SWORDS_PER_BLADE } from "../../content/extensions";
  import { chainFlow, stationCost } from "../../game/extensions";
  import { formatNumber } from "../format";

  let { game, snap }: { game: GameController; snap: Snapshot } = $props();

  const flow = $derived(chainFlow(snap.state));
  const stock = $derived([snap.state.workshop.ore, snap.state.workshop.ingots, snap.state.workshop.blades]);
</script>

<section class="panel-section">
  <h3 class="section-title">{$tx("Werkstatt-Kette")}</h3>
  <p class="hint">{$tx("Erz → Barren → Meisterklingen. Jede Klinge bringt {n} Schwerter. Die langsamste Station bremst die ganze Kette.", { n: String(SWORDS_PER_BLADE) })}</p>
  <ol class="chain">
    {#each STATION_IDS as id, i (id)}
      {@const def = STATIONS[id]}
      {@const cost = stationCost(snap.state, id)}
      <li class="station" class:slow={flow.bottleneck === id}>
        <div class="head">
          <span class="name">{$bi(def.name)}</span>
          <span class="num">{$tx("Stufe")} {snap.state.workshop.levels[id]}</span>
        </div>
        <div class="flow num">
          {formatNumber(flow.actual[id])}/{formatNumber(flow.capacity[id])} {$bi(def.output)}/s
          {#if flow.bottleneck === id}<span class="tag">{$tx("Engpass")}</span>{/if}
        </div>
        <div class="stock num">{$tx("Lager")}: {formatNumber(stock[i] ?? 0)} {$bi(def.output)}</div>
        <button class="btn" disabled={snap.state.resources.iron.lt(cost)} onclick={() => game.dispatch({ type: "upgradeStation", station: id })}>
          {$tx("Ausbauen")} <span class="num">{formatNumber(cost)}</span> {$tx("Eisen")}
        </button>
      </li>
    {/each}
  </ol>
</section>

<style>
  .hint {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin: 0 0 8px;
  }

  .chain {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 8px;
  }

  .station {
    display: grid;
    gap: 4px;
    padding: 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-sunken);
  }

  .station.slow {
    border-color: var(--ember);
  }

  .head {
    display: flex;
    justify-content: space-between;
    gap: 6px;
  }

  .name {
    font-family: var(--font-display);
  }

  .flow,
  .stock {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .tag {
    margin-left: 4px;
    color: var(--ember);
  }
</style>
