<script lang="ts">
  import { tx } from "../../i18n";
  import { loc } from "../../i18n/content";
  import { t } from "../../i18n";
  import type { GameController, Snapshot } from "../../app/controller";
    import { BUILDINGS, type BuildingId } from "../../content/balance";
  import { type BuyAmount, resolveBuyAmount } from "../../game/actions";
  import { buildingCost, unitRate } from "../../game/rates";
    import { formatNumber } from "../format";

  let {
    game,
    snap,
    building,
    amount,
  }: { game: GameController; snap: Snapshot; building: BuildingId; amount: BuyAmount } = $props();

  const def = $derived(BUILDINGS[building]);
  const count = $derived(resolveBuyAmount(snap.state, building, amount));
  const shown = $derived(Math.max(1, count));
  const cost = $derived(buildingCost(snap.state, building, shown));
  const affordable = $derived(count >= 1 && snap.state.resources[def.costResource].gte(cost));
  const perUnit = $derived(unitRate(snap.state, building));
</script>

<div class="row">
  <div class="info">
    <div class="head">
      <span class="name">{$loc.building(building).name}</span>
      <span class="owned num" aria-label={$tx("Anzahl")}>{snap.state.buildings[building]}</span>
    </div>
    <p class="desc">{$loc.building(building).description}</p>
    <p class="yield num">
      {$tx("je")} +{formatNumber(perUnit)} {$t(`res.${def.produces}`)}/s · {$tx("gesamt")} +{formatNumber(perUnit.mul(snap.state.buildings[building]))}/s
    </p>
  </div>
  <button
    class="btn buy"
    disabled={!affordable}
    onclick={() => game.dispatch({ type: "buyBuilding", building, amount })}
  >
    <span>{$tx("Kaufen")} ×{shown}</span>
    <span class="cost num">{formatNumber(cost)} {$t(`res.${def.costResource}`)}</span>
  </button>
</div>

<style>
  .row {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
  }

  .info {
    flex: 1;
    min-width: 0;
  }

  .head {
    display: flex;
    gap: 8px;
    align-items: baseline;
  }

  .name {
    font-family: var(--font-display);
    font-size: 1.1rem;
  }

  .owned {
    color: var(--gold);
  }

  .desc {
    margin: 2px 0;
    color: var(--text-muted);
    font-family: var(--font-story);
    font-style: italic;
  }

  .yield {
    margin: 0;
    font-size: 0.82rem;
    color: var(--text-faint);
  }

  .buy {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    min-width: 132px;
    flex-shrink: 0;
  }

  .cost {
    font-size: 0.82rem;
    color: var(--gold);
  }

  @media (max-width: 480px) {
    .row {
      flex-direction: column;
      align-items: stretch;
    }
    .buy {
      align-items: center;
    }
  }
</style>
