<script lang="ts">
  import { tx } from "../../i18n";
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

  /** Aufsteigende Zahlen beim Klick; nach der Animation (900 ms) wieder entfernt. */
  let floaters = $state<{ id: number; text: string; x: number }[]>([]);
  let nextFloater = 0;
  function collect(event: MouseEvent): void {
    const value = clickValue(snap.state);
    if (!game.dispatch({ type: "collect" }).ok || value.lte(0)) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const id = nextFloater++;
    floaters = [...floaters, { id, text: `+${formatNumber(value)}`, x: event.clientX - rect.left }];
    setTimeout(() => (floaters = floaters.filter((f) => f.id !== id)), 900);
  }
</script>

<section class="panel-section">
  <button class="collect" onclick={collect}>
    {#each floaters as f (f.id)}<span class="floater num" style:left="{f.x}px" aria-hidden="true">{f.text}</span>{/each}
    <span class="label">{$tx("Steuern eintreiben")}</span>
    <span class="value num">+{formatNumber(clickValue(snap.state))} Gold</span>
  </button>
</section>

{#if snap.state.upgrades.steward}
  <label class="steward">
    <input
      type="checkbox"
      checked={snap.state.automation.enabled}
      onchange={(e) => game.dispatch({ type: "setAutomation", enabled: e.currentTarget.checked })}
    />
    <span>{$tx("Der Verwalter kauft Gold-Gebäude mit der kürzesten Amortisation")}</span>
  </label>
{/if}

<section class="panel-section">
  <div class="bar">
    <h3 class="section-title">{$tx("Ländereien")}</h3>
    <BuyAmountToggle bind:value={amount} />
  </div>
  {#each KEEP_BUILDINGS.filter((id) => isBuildingVisible(snap.state, id)) as id (id)}
    <BuildingRow {game} {snap} building={id} {amount} />
  {/each}
</section>

<UpgradeList {game} {snap} tile="keep" />

<style>
  .collect {
    position: relative;
    overflow: hidden;
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

  .steward {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 12px;
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .floater {
    position: absolute;
    top: 30%;
    transform: translateX(-50%);
    color: var(--gold);
    font-weight: 600;
    pointer-events: none;
    animation: rise 900ms ease-out forwards;
  }

  @keyframes rise {
    to {
      transform: translate(-50%, -48px);
      opacity: 0;
    }
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
