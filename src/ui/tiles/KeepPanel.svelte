<script lang="ts">
  import type { GameController } from "../../app/controller";
  import { BUILDINGS, BUILDING_IDS } from "../../content/balance";
  import type { BuyAmount } from "../../game/actions";
  import { clickValue, isBuildingVisible } from "../../game/rates";
  import { formatNumber } from "../format";
  import BuildingRow from "./BuildingRow.svelte";
  import BuyAmountToggle from "./BuyAmountToggle.svelte";
  import UpgradeList from "./UpgradeList.svelte";

  let { game }: { game: GameController } = $props();

  const snapshot = $derived(game.snapshot);
  const snap = $derived($snapshot);
  const KEEP_BUILDINGS = BUILDING_IDS.filter((id) => BUILDINGS[id].tile === "keep");
  let amount = $state<BuyAmount>(1);
</script>

<section class="panel-section">
  <button class="collect" onclick={() => game.dispatch({ type: "collect" })}>
    <span class="label">Steuern eintreiben</span>
    <span class="value num">+{formatNumber(clickValue(snap.state))} Gold</span>
  </button>
</section>

<section class="panel-section">
  <div class="bar">
    <h3 class="section-title">Ländereien</h3>
    <BuyAmountToggle bind:value={amount} />
  </div>
  {#each KEEP_BUILDINGS.filter((id) => isBuildingVisible(snap.state, id)) as id (id)}
    <BuildingRow {game} {snap} building={id} {amount} />
  {/each}
</section>

<UpgradeList {game} {snap} tile="keep" />

<style>
  .collect {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 14px;
    background: linear-gradient(180deg, #3a2a17 0%, #22180e 100%);
    border: 1px solid var(--gold);
    border-radius: var(--radius);
    transition: transform 60ms ease, filter 120ms ease;
  }

  .collect:hover {
    filter: brightness(1.12);
  }

  .collect:active {
    transform: scale(0.985);
  }

  .label {
    font-family: var(--font-display);
    font-size: 1.3rem;
    color: var(--gold);
  }

  .value {
    color: var(--text-muted);
    font-size: 0.9rem;
  }

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
</style>
