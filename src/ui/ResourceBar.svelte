<script lang="ts">
  import type { Snapshot } from "../app/controller";
  import { SEAL_BONUS } from "../content/balance";
  import { armedBonus } from "../game/rates";
  import { aliveSoldiers } from "../game/state";
  import { formatNumber, formatPercent } from "./format";

  let { snap }: { snap: Snapshot } = $props();

  const bonus = $derived(armedBonus(snap.state));
  const soldiers = $derived(aliveSoldiers(snap.state));
</script>

<dl class="resources">
  <div class="res gold">
    <dt>Gold</dt>
    <dd class="num">{formatNumber(snap.state.resources.gold)} <small>+{formatNumber(snap.rates.gold)}/s</small></dd>
  </div>
  {#if snap.state.tiles.forge}
    <div class="res iron">
      <dt>Eisen</dt>
      <dd class="num">{formatNumber(snap.state.resources.iron)} <small>+{formatNumber(snap.rates.iron)}/s</small></dd>
    </div>
    <div class="res swords">
      <dt>Schwerter</dt>
      <dd class="num">{formatNumber(snap.state.resources.swords)} <small>+{formatPercent(bonus)} Gold</small></dd>
    </div>
  {/if}
  {#if snap.state.tiles.warroom}
    <div class="res soldiers">
      <dt>Soldaten</dt>
      <dd class="num">{formatNumber(soldiers)} <small>{formatNumber(snap.state.warroom.soldiers)} bereit</small></dd>
    </div>
  {/if}
  {#if snap.state.tiles.dungeon}
    <div class="res prisoners">
      <dt>Gefangene</dt>
      <dd class="num">{formatNumber(snap.state.dungeon.prisoners)} <small>{formatNumber(snap.state.dungeon.intel)} Hinweise</small></dd>
    </div>
  {/if}
  {#if snap.state.tiles.crypt}
    <div class="res souls">
      <dt>Seelen</dt>
      <dd class="num">{formatNumber(snap.state.resources.souls)} <small>+{formatNumber(snap.rates.souls)}/s</small></dd>
    </div>
  {/if}
  {#if snap.state.warroom.seals > 0}
    <div class="res seals">
      <dt>Ordenssiegel</dt>
      <dd class="num">{snap.state.warroom.seals} <small>+{formatPercent(snap.state.warroom.seals * SEAL_BONUS)}</small></dd>
    </div>
  {/if}
</dl>

<style>
  .resources {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 0;
  }

  .res {
    background: var(--bg-sunken);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 6px 12px;
    min-width: 118px;
  }

  dt {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
  }

  dd {
    margin: 0;
    font-size: 1.15rem;
  }

  small {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .gold dd {
    color: var(--gold);
  }
  .iron dd {
    color: var(--iron);
  }
  .swords dd {
    color: var(--blood-bright);
  }
  .soldiers dd {
    color: var(--text);
  }
  .prisoners dd {
    color: var(--moss);
  }
  .souls dd {
    color: var(--soul);
  }
  .seals dd {
    color: var(--iron);
  }
</style>
