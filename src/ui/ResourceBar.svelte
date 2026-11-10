<script lang="ts">
  import type { Snapshot } from "../app/controller";
  import { SWORD_GOLD_BONUS } from "../content/balance";
      import { formatNumber, formatPercent } from "./format";

  let { snap }: { snap: Snapshot } = $props();

  const swordBonus = $derived(snap.state.resources.swords.toNumber() * SWORD_GOLD_BONUS);
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
      <dd class="num">{formatNumber(snap.state.resources.swords)} <small>+{formatPercent(swordBonus)} Gold</small></dd>
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
    min-width: 130px;
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
</style>
