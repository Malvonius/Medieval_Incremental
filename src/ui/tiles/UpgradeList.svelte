<script lang="ts">
  import type { GameController, Snapshot } from "../../app/controller";
    import { UPGRADES, UPGRADE_IDS } from "../../content/balance";
  import type { TileId } from "../../content/ids";
  import { isUpgradeVisible } from "../../game/rates";
    import { formatNumber } from "../format";
  import { RESOURCE_LABELS } from "../labels";

  let {
    game,
    snap,
    tile,
    title = "Verbesserungen",
  }: { game: GameController; snap: Snapshot; tile: TileId; title?: string } = $props();

  const ofTile = $derived(UPGRADE_IDS.filter((id) => UPGRADES[id].tile === tile));
  const visible = $derived(ofTile.filter((id) => isUpgradeVisible(snap.state, id)));
  const owned = $derived(ofTile.filter((id) => snap.state.upgrades[id]).length);
</script>

<section class="panel-section">
  <h3 class="section-title">{title} <small class="num">{owned}/{ofTile.length}</small></h3>
  {#if visible.length === 0}
    <p class="empty">Noch nichts verfügbar.</p>
  {:else}
    <ul>
      {#each visible as id (id)}
        {@const def = UPGRADES[id]}
        <li>
          <button
            class="btn upgrade"
            disabled={snap.state.resources[def.costResource].lt(def.cost)}
            onclick={() => game.dispatch({ type: "buyUpgrade", upgrade: id })}
          >
            <span class="name">{def.name}</span>
            <span class="desc">{def.description}</span>
            <span class="cost num">{formatNumber(def.cost)} {RESOURCE_LABELS[def.costResource]}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;
  }

  .upgrade {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    gap: 2px;
  }

  .name {
    font-family: var(--font-display);
  }

  .desc {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .cost {
    font-size: 0.82rem;
    color: var(--gold);
  }

  .empty {
    color: var(--text-faint);
    font-style: italic;
    margin: 0;
  }

  small {
    color: var(--text-faint);
    font-family: var(--font-ui);
    font-size: 0.8rem;
  }
</style>
