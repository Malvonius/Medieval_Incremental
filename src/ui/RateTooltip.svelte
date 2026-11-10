<script lang="ts">
  import type { Snapshot } from "../app/controller";
  import { Decimal } from "../core/decimal";
  import type { ResourceId } from "../content/ids";
  import { baseSources, resourceFactors } from "../game/rates";
  import { tx } from "../i18n";
  import { loc } from "../i18n/content";
  import { formatFactor, formatNumber } from "./format";

  let { snap, resource, id }: { snap: Snapshot; resource: ResourceId; id: string } = $props();

  const sources = $derived(baseSources(snap.state, resource));
  const factors = $derived(resourceFactors(snap.state, resource));
  const base = $derived(sources.reduce((sum, s) => sum.add(s.value), new Decimal(0)));
</script>

<div class="tooltip" role="tooltip" {id}>
  <p class="head">{$tx("Woraus sich die Rate zusammensetzt")}</p>
  {#if sources.length === 0}
    <p class="empty">{$tx("Noch keine Produktion.")}</p>
  {:else}
    <table>
      <tbody>
        {#each sources as s (s.label)}
          <tr><th>{s.building ? $loc.building(s.building).name : $tx(s.label)}</th><td class="num">{formatNumber(s.value)}/s</td></tr>
        {/each}
        <tr class="sum"><th>{$tx("Grundproduktion")}</th><td class="num">{formatNumber(base)}/s</td></tr>
        {#each factors as f (f.label)}
          <tr><th>{$tx(f.label)}</th><td class="num">×{formatFactor(f.value)}</td></tr>
        {/each}
        <tr class="sum total"><th>{$tx("Gesamt")}</th><td class="num">{formatNumber(snap.rates[resource])}/s</td></tr>
      </tbody>
    </table>
  {/if}
</div>

<style>
  .tooltip {
    position: absolute;
    top: calc(100% + 6px);
    /* Am rechten Rand des Chips: öffnet nach links und bleibt so auch ganz rechts im Bild. */
    right: 0;
    z-index: 40;
    min-width: 240px;
    max-width: min(320px, calc(100vw - 32px));
    padding: 10px 12px;
    background: #1a140f;
    border: 1px solid var(--gold);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    /* display statt visibility: Ausgeblendet belegt der Tooltip keinen Platz und erzeugt kein Scrollen. */
    display: none;
    pointer-events: none;
  }

  :global(.res:hover) > .tooltip,
  :global(.res:focus-visible) > .tooltip,
  :global(.res:focus-within) > .tooltip {
    display: block;
  }

  .head {
    margin: 0 0 6px;
    font-family: var(--font-display);
    color: var(--gold);
    font-size: 0.9rem;
  }

  .empty {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }

  th {
    text-align: left;
    font-weight: 400;
    color: var(--text-muted);
    padding: 1px 8px 1px 0;
  }

  td {
    text-align: right;
    color: var(--text);
  }

  .sum th,
  .sum td {
    border-top: 1px solid var(--border-strong);
    padding-top: 3px;
    color: var(--text);
  }

  .total td {
    color: var(--gold);
  }
</style>
