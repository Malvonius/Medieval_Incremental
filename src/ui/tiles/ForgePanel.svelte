<script lang="ts">
  import type { GameController } from "../../app/controller";
  import { Decimal } from "../../core/decimal";
  import { BUILDINGS, BUILDING_IDS, FORGE_QUEUE_CAPACITY, RECIPES, SWORD_GOLD_BONUS } from "../../content/balance";
  import type { ResourceId } from "../../content/ids";
  import type { BuyAmount } from "../../game/actions";
  import { craftDuration } from "../../game/rates";
  import { formatDuration, formatNumber, formatPercent } from "../format";
  import { RESOURCE_LABELS } from "../labels";
  import BuildingRow from "./BuildingRow.svelte";
  import BuyAmountToggle from "./BuyAmountToggle.svelte";
  import UpgradeList from "./UpgradeList.svelte";

  let { game }: { game: GameController } = $props();

  const snapshot = $derived(game.snapshot);
  const snap = $derived($snapshot);
  const FORGE_BUILDINGS = BUILDING_IDS.filter((id) => BUILDINGS[id].tile === "forge");
  const recipe = RECIPES.sword;
  const inputs = Object.entries(recipe.inputs) as [ResourceId, number][];
  let amount = $state<BuyAmount>(1);

  const duration = $derived(craftDuration(snap.state, "sword"));
  const queueLength = $derived(snap.state.forge.queue.length);
  const progress = $derived(queueLength > 0 ? Math.min(1, snap.state.forge.progress / duration) : 0);
  const freeSlots = $derived(FORGE_QUEUE_CAPACITY - queueLength);
  /** Wie viele Aufträge Rohstoffe und freie Plätze erlauben. */
  const fillable = $derived(
    Math.min(freeSlots, ...inputs.map(([res, cost]) => Decimal.floor(snap.state.resources[res].div(cost)).toNumber())),
  );
  const swordBonus = $derived(snap.state.resources.swords.toNumber() * SWORD_GOLD_BONUS);
</script>

<section class="panel-section">
  <div class="bar">
    <h3 class="section-title">Bergwerk</h3>
    <BuyAmountToggle bind:value={amount} />
  </div>
  {#each FORGE_BUILDINGS as id (id)}
    <BuildingRow {game} {snap} building={id} {amount} />
  {/each}
</section>

<section class="panel-section">
  <h3 class="section-title">Esse</h3>
  <div class="recipe">
    <div class="recipe-head">
      <span class="name">{recipe.name}</span>
      <span class="meta num">
        {#each inputs as [res, cost], i (res)}{i > 0 ? " · " : ""}{formatNumber(cost)} {RESOURCE_LABELS[res]}{/each}
        · {formatDuration(duration)}
      </span>
    </div>
    <p class="desc">{recipe.description}</p>

    <div class="queue" aria-label="Warteschlange: {queueLength} von {FORGE_QUEUE_CAPACITY}">
      {#each { length: FORGE_QUEUE_CAPACITY }, slot (slot)}
        <span class="slot" class:filled={slot < queueLength}>
          {#if slot === 0 && queueLength > 0}
            <span class="fill" style:width="{progress * 100}%"></span>
          {/if}
        </span>
      {/each}
    </div>

    <div class="actions">
      <button class="btn" disabled={fillable < 1} onclick={() => game.dispatch({ type: "craft", recipe: "sword", amount: 1 })}>
        Schmieden
      </button>
      <button
        class="btn"
        disabled={fillable < 2}
        onclick={() => game.dispatch({ type: "craft", recipe: "sword", amount: fillable })}
      >
        Warteschlange füllen{fillable >= 2 ? ` (×${fillable})` : ""}
      </button>
    </div>
  </div>
</section>

<section class="panel-section">
  <h3 class="section-title">Waffenkammer</h3>
  <p class="armory">
    <span class="num swords">{formatNumber(snap.state.resources.swords)}</span> Klingen an der Wand –
    Goldproduktion <span class="num">+{formatPercent(swordBonus)}</span>
  </p>
</section>

<UpgradeList {game} {snap} tile="forge" />

<style>
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid var(--border);
  }

  .bar .section-title {
    border: none;
    margin: 0;
  }

  .recipe {
    background: var(--bg-sunken);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px 14px;
  }

  .recipe-head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 4px 12px;
    align-items: baseline;
  }

  .name {
    font-family: var(--font-display);
    font-size: 1.15rem;
  }

  .meta {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .desc {
    margin: 4px 0 10px;
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .queue {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    margin-bottom: 10px;
  }

  .slot {
    position: relative;
    height: 12px;
    border: 1px solid var(--border-strong);
    border-radius: 3px;
    background: var(--bg);
    overflow: hidden;
  }

  .slot.filled {
    background: #3a1d14;
    border-color: var(--ember);
  }

  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    background: linear-gradient(90deg, var(--blood) 0%, var(--ember) 100%);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .armory {
    margin: 0;
  }

  .swords {
    color: var(--blood-bright);
    font-size: 1.2rem;
  }
</style>
