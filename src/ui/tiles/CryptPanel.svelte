<script lang="ts">
  import type { GameController } from "../../app/controller";
  import { BUILDINGS, BUILDING_IDS, FALLEN_SOUL_RATE } from "../../content/balance";
  import type { BuyAmount } from "../../game/actions";
  import { fallenSoulBase, isBuildingVisible, resourceMultiplier } from "../../game/rates";
  import { formatNumber } from "../format";
  import BuildingRow from "./BuildingRow.svelte";
  import BuyAmountToggle from "./BuyAmountToggle.svelte";
  import UpgradeList from "./UpgradeList.svelte";

  let { game }: { game: GameController } = $props();

  const snapshot = $derived(game.snapshot);
  const snap = $derived($snapshot);
  const CRYPT_BUILDINGS = BUILDING_IDS.filter((id) => BUILDINGS[id].tile === "crypt");
  let amount = $state<BuyAmount>(1);

  const fromFallen = $derived(resourceMultiplier(snap.state, "souls").mul(fallenSoulBase(snap.state)));
</script>

<section class="panel-section">
  <h3 class="section-title">Die Gefallenen</h3>
  <p class="fallen">
    <span class="num big">{formatNumber(snap.state.warroom.fallen)}</span> Gefallene ruhen in der Krypta. Jeder gibt
    <span class="num">{formatNumber(FALLEN_SOUL_RATE)}</span> Seelen/s ab – zusammen
    <span class="num souls">+{formatNumber(fromFallen)}/s</span>.
  </p>
  <p class="hint">Jede Expedition, die Opfer fordert, füllt die Krypta weiter.</p>
</section>

<section class="panel-section">
  <div class="bar">
    <h3 class="section-title">Gebeine und Lichter</h3>
    <BuyAmountToggle bind:value={amount} />
  </div>
  {#each CRYPT_BUILDINGS.filter((id) => isBuildingVisible(snap.state, id)) as id (id)}
    <BuildingRow {game} {snap} building={id} {amount} />
  {/each}
</section>

<UpgradeList {game} {snap} tile="crypt" title="Pakte" />

<style>
  .fallen {
    margin: 0;
  }

  .big {
    font-size: 1.4rem;
    color: var(--blood-bright);
  }

  .souls {
    color: var(--soul);
  }

  .hint {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin: 4px 0 0;
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
