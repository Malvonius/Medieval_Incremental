<script lang="ts">
  import type { Snapshot } from "../app/controller";
  import { SEAL_BONUS, WAVES } from "../content/balance";
  import { armedBonus, ashMultiplier, defense } from "../game/rates";
  import { siegeActive } from "../game/siege";
  import { aliveSoldiers } from "../game/state";
  import { formatNumber, formatPercent } from "./format";
  import { t, tx } from "../i18n";
  import RateTooltip from "./RateTooltip.svelte";

  let { snap }: { snap: Snapshot } = $props();

  const bonus = $derived(armedBonus(snap.state));
  const soldiers = $derived(aliveSoldiers(snap.state));
</script>

<ul class="resources" aria-label={$tx("Vorräte")}>
  <li class="res gold">
    <span class="label">{$t("res.gold")}</span>
    <span class="value num">{formatNumber(snap.state.resources.gold)} <small>+{formatNumber(snap.rates.gold)}/s</small></span>
      <button class="info" type="button" aria-label={$tx("Aufschlüsselung anzeigen")} aria-describedby="rate-gold">i</button>
      <RateTooltip {snap} resource="gold" id="rate-gold" />
  </li>
  {#if snap.state.tiles.forge}
    <li class="res iron">
      <span class="label">{$t("res.iron")}</span>
      <span class="value num">{formatNumber(snap.state.resources.iron)} <small>+{formatNumber(snap.rates.iron)}/s</small></span>
      <button class="info" type="button" aria-label={$tx("Aufschlüsselung anzeigen")} aria-describedby="rate-iron">i</button>
      <RateTooltip {snap} resource="iron" id="rate-iron" />
    </li>
    <li class="res swords">
      <span class="label">{$t("res.swords")}</span>
      <span class="value num">{formatNumber(snap.state.resources.swords)} <small>+{formatPercent(bonus)} {$tx("Gold")}</small></span>
    </li>
  {/if}
  {#if snap.state.tiles.warroom}
    <li class="res soldiers">
      <span class="label">{$t("res.soldiers")}</span>
      <span class="value num">{formatNumber(soldiers)} <small>{formatNumber(snap.state.warroom.soldiers)} {$tx("bereit")}</small></span>
    </li>
  {/if}
  {#if snap.state.tiles.dungeon}
    <li class="res prisoners">
      <span class="label">{$t("res.prisoners")}</span>
      <span class="value num">{formatNumber(snap.state.dungeon.prisoners)} <small>{formatNumber(snap.state.dungeon.intel)} {$tx("Hinweise")}</small></span>
    </li>
  {/if}
  {#if siegeActive(snap.state)}
    <li class="res defense">
      <span class="label">{$t("res.defense")}</span>
      <span class="value num">{formatNumber(defense(snap.state))} <small>{$tx("Welle")} {snap.state.siege.wave + 1}/{WAVES.length}</small></span>
    </li>
  {/if}
  {#if snap.state.tiles.crypt}
    <li class="res souls">
      <span class="label">{$t("res.souls")}</span>
      <span class="value num">{formatNumber(snap.state.resources.souls)} <small>+{formatNumber(snap.rates.souls)}/s</small></span>
      <button class="info" type="button" aria-label={$tx("Aufschlüsselung anzeigen")} aria-describedby="rate-souls">i</button>
      <RateTooltip {snap} resource="souls" id="rate-souls" />
    </li>
  {/if}
  {#if snap.state.tiles.chapel}
    <li class="res faith">
      <span class="label">{$t("res.faith")}</span>
      <span class="value num">{formatNumber(snap.state.resources.faith)} <small>+{formatNumber(snap.rates.faith)}/s</small></span>
      <button class="info" type="button" aria-label={$tx("Aufschlüsselung anzeigen")} aria-describedby="rate-faith">i</button>
      <RateTooltip {snap} resource="faith" id="rate-faith" />
    </li>
  {/if}
  {#if snap.state.ritual.ash > 0}
    <li class="res ash">
      <span class="label">{$t("res.ash")}</span>
      <span class="value num">{formatNumber(snap.state.ritual.ash)} <small>×{formatNumber(ashMultiplier(snap.state))}</small></span>
    </li>
  {/if}
  {#if snap.state.warroom.seals > 0}
    <li class="res seals">
      <span class="label">{$t("res.seals")}</span>
      <span class="value num">{snap.state.warroom.seals} <small>+{formatPercent(snap.state.warroom.seals * SEAL_BONUS)}</small></span>
    </li>
  {/if}
</ul>

<style>
  .resources {
    list-style: none;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 0;
  }

  .label::before {
    margin-right: 4px;
    color: var(--gold);
  }
  .gold .label::before { content: "⛁"; }
  .iron .label::before { content: "⚒"; }
  .swords .label::before { content: "⚔"; }
  .soldiers .label::before { content: "⛨"; }
  .prisoners .label::before { content: "⛓"; }
  .souls .label::before { content: "☽"; }
  .faith .label::before { content: "✝"; }
  .ash .label::before { content: "✶"; }
  .seals .label::before { content: "⚜"; }
  .defense .label::before { content: "♜"; }

  .info {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 16px;
    height: 16px;
    padding: 0;
    border-radius: 50%;
    border: 1px solid var(--border-strong);
    background: transparent;
    color: var(--text-muted);
    font: italic 600 0.65rem/1 Georgia, serif;
  }

  .info:hover,
  .info:focus-visible {
    color: var(--gold);
    border-color: var(--gold);
  }

  .res {
    position: relative;
    background: linear-gradient(180deg, #1a1510 0%, #0d0a08 100%);
    box-shadow: inset 0 1px 0 rgb(255 230 180 / 0.05);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 6px 24px 6px 12px;
    min-width: 118px;
  }

  .label {
    display: block;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
  }

  .value {
    display: block;
    margin: 0;
    font-size: 1.15rem;
  }

  small {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .gold .value {
    color: var(--gold);
  }
  .iron .value {
    color: var(--iron);
  }
  .swords .value {
    color: var(--blood-bright);
  }
  .soldiers .value {
    color: var(--text);
  }
  .prisoners .value {
    color: var(--moss);
  }
  .souls .value {
    color: var(--soul);
  }
  .defense .value {
    color: var(--blood-bright);
  }
  .faith .value {
    color: #e8d9a8;
  }
  .ash .value {
    color: var(--ember);
  }
  .seals .value {
    color: var(--iron);
  }
</style>
