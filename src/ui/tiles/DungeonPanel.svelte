<script lang="ts">
  import type { GameController } from "../../app/controller";
  import {
    INTEL_FOR_KOMTUREI,
    INTEL_FOR_OUTPOST,
    LABOR_GOLD_BONUS,
    LABOR_IRON_BONUS,
    SEALS_FOR_KOMTUREI,
  } from "../../content/balance";
  import { intelPerInterrogation, laborMultiplier } from "../../game/rates";
  import { formatNumber, formatPercent } from "../format";
  import UpgradeList from "./UpgradeList.svelte";

  let { game }: { game: GameController } = $props();

  const snapshot = $derived(game.snapshot);
  const snap = $derived($snapshot);
  // Flache Kopie: Der Spielstand wird intern verändert; ein $derived auf dasselbe Objekt würde nie neu auslösen.
  const dungeon = $derived({ ...snap.state.dungeon });
  const perInterrogation = $derived(intelPerInterrogation(snap.state));
  const laborMult = $derived(laborMultiplier(snap.state));

  const leads = $derived([
    {
      label: `${INTEL_FOR_OUTPOST} Hinweise`,
      text: snap.state.flags.outpostKnown ? "Die Lage des Vorpostens" : "Wo zahlt der Orden seine Söldner aus?",
      known: snap.state.flags.outpostKnown,
    },
    {
      label: `${INTEL_FOR_KOMTUREI} Hinweise · ${SEALS_FOR_KOMTUREI} Ordenssiegel`,
      text: snap.state.flags.komtureiKnown ? "Der Weg nach Grauweiler" : "Wer verrät dich an den Orden?",
      known: snap.state.flags.komtureiKnown,
    },
  ]);
</script>

<section class="panel-section">
  <h3 class="section-title">Zellen</h3>
  <p class="count"><span class="num big">{formatNumber(dungeon.prisoners)}</span> Gefangene in Ketten</p>
  <div class="choices">
    <div class="choice">
      <h4>Verhören</h4>
      <p>Jedes Verhör bringt <strong class="num">{perInterrogation}</strong> {perInterrogation === 1 ? "Hinweis" : "Hinweise"}. Der Gefangene überlebt es nicht.</p>
      <div class="row">
        <button class="btn" disabled={dungeon.prisoners < 1} onclick={() => game.dispatch({ type: "interrogate", amount: 1 })}>×1</button>
        <button
          class="btn"
          disabled={dungeon.prisoners < 2}
          onclick={() => game.dispatch({ type: "interrogate", amount: dungeon.prisoners })}>Alle</button
        >
      </div>
    </div>
    <div class="choice">
      <h4>Zur Fron zwingen</h4>
      <p>
        Jeder Fronarbeiter: <strong class="num">+{formatPercent(LABOR_IRON_BONUS * laborMult)}</strong> Eisen,
        <strong class="num">+{formatPercent(LABOR_GOLD_BONUS * laborMult)}</strong> Gold. Für immer.
      </p>
      <div class="row">
        <button class="btn" disabled={dungeon.prisoners < 1} onclick={() => game.dispatch({ type: "forceLabor", amount: 1 })}>×1</button>
        <button
          class="btn"
          disabled={dungeon.prisoners < 2}
          onclick={() => game.dispatch({ type: "forceLabor", amount: dungeon.prisoners })}>Alle</button
        >
      </div>
    </div>
  </div>
</section>

<section class="panel-section">
  <h3 class="section-title">Hinweise <small class="num">{formatNumber(dungeon.intel)} gesammelt</small></h3>
  <ul class="leads">
    {#each leads as lead (lead.label)}
      <li class:known={lead.known}>
        <span class="mark" aria-hidden="true">{lead.known ? "✓" : "…"}</span>
        <span class="label num">{lead.label}</span>
        <span class="text">{lead.text}</span>
      </li>
    {/each}
  </ul>
</section>

<section class="panel-section">
  <h3 class="section-title">Fronarbeit</h3>
  <p class="labor num">
    {formatNumber(dungeon.laborers)} Arbeiter in Stollen und Feldern:
    +{formatPercent(dungeon.laborers * LABOR_IRON_BONUS * laborMult)} Eisen,
    +{formatPercent(dungeon.laborers * LABOR_GOLD_BONUS * laborMult)} Gold
  </p>
</section>

<UpgradeList {game} {snap} tile="dungeon" />

<style>
  .count {
    margin: 0 0 10px;
  }

  .big {
    font-size: 1.5rem;
    color: var(--moss);
  }

  .choices {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 10px;
  }

  .choice {
    background: var(--bg-sunken);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px 14px;
  }

  h4 {
    margin: 0 0 4px;
    font-family: var(--font-display);
    font-weight: 400;
    font-size: 1.1rem;
  }

  .choice p {
    margin: 0 0 8px;
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .row {
    display: flex;
    gap: 8px;
  }

  small {
    color: var(--text-faint);
    font-family: var(--font-ui);
    font-size: 0.8rem;
  }

  .leads {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }

  .leads li {
    display: grid;
    grid-template-columns: 1.2em max-content 1fr;
    gap: 10px;
    align-items: baseline;
    color: var(--text-muted);
  }

  .leads li.known {
    color: var(--text);
  }

  .leads .known .mark {
    color: var(--moss);
  }

  .label {
    font-size: 0.85rem;
    color: var(--text-faint);
  }

  .text {
    font-family: var(--font-story);
    font-style: italic;
  }

  .labor {
    margin: 0;
  }

  @media (max-width: 480px) {
    .leads li {
      grid-template-columns: 1.2em 1fr;
    }
    .leads .text {
      grid-column: 2;
    }
  }
</style>
