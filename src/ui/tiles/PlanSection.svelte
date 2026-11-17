<script lang="ts">
  import { tx } from "../../i18n";
  import { loc } from "../../i18n/content";
  import type { GameController, Snapshot } from "../../app/controller";
  import { BUILDING_IDS, type BuildingId } from "../../content/balance";
  import { PLAN_COLUMNS, PLAN_NEIGHBOUR_BONUS } from "../../content/living";
  import { goodNeighbours, planFactor, planNeighbours } from "../../game/living";
  import { formatPercent } from "../format";

  let { game, snap }: { game: GameController; snap: Snapshot } = $props();

  let selected = $state<number | null>(null);
  const plan = $derived([...snap.state.plan]);
  const owned = $derived(BUILDING_IDS.filter((id) => snap.state.buildings[id] > 0));
  /** Kurzname aus dem ersten Wort, damit die Felder lesbar bleiben. */
  const short = (id: BuildingId): string => $loc.building(id).name.split(/[\s-]/)[0] ?? id;

  function place(building: BuildingId | null): void {
    if (selected === null) return;
    game.dispatch({ type: "placeDistrict", index: selected, building });
    selected = null;
  }

  /** Felder, die mit dem Nachbarn eine gute Verbindung bilden: für die Linien zwischen den Feldern. */
  const links = $derived(
    plan.flatMap((a, i) =>
      a === null
        ? []
        : planNeighbours(i)
            .filter((j) => j > i)
            .flatMap((j) => {
              const b = plan[j];
              return b && goodNeighbours(a, b) ? [[i, j] as const] : [];
            }),
    ),
  );
</script>

{#if owned.length > 0}
  <section class="panel-section">
    <h3 class="section-title">{$tx("Burgplan")}</h3>
    <p class="hint">
      {$tx("Ordne die Viertel der Burg an. Gute Nachbarn – etwa Mühle neben Leibeigenen oder Münze neben Bank – stärken sich gegenseitig um je {bonus}.", { bonus: formatPercent(PLAN_NEIGHBOUR_BONUS) })}
    </p>
    <div class="plan" style:grid-template-columns="repeat({PLAN_COLUMNS}, minmax(0, 1fr))">
      <svg class="links" viewBox="0 0 {PLAN_COLUMNS} {Math.ceil(plan.length / PLAN_COLUMNS)}" preserveAspectRatio="none" aria-hidden="true">
        {#each links as [a, b] (`${a}-${b}`)}
          <line x1={(a % PLAN_COLUMNS) + 0.5} y1={Math.floor(a / PLAN_COLUMNS) + 0.5} x2={(b % PLAN_COLUMNS) + 0.5} y2={Math.floor(b / PLAN_COLUMNS) + 0.5} />
        {/each}
      </svg>
      {#each plan as cell, i (i)}
        {@const bonus = cell ? planFactor(snap.state, cell) : 1}
        <button
          class="plot"
          class:filled={cell !== null}
          class:selected={selected === i}
          aria-pressed={selected === i}
          aria-label={cell ? `${$loc.building(cell).name} (${formatPercent(bonus - 1)})` : $tx("Freier Bauplatz")}
          onclick={() => (selected = selected === i ? null : i)}
        >
          {#if cell}
            <span class="name">{short(cell)}</span>
            {#if bonus > 1}<span class="bonus num">+{formatPercent(bonus - 1)}</span>{/if}
          {:else}
            <span class="empty">＋</span>
          {/if}
        </button>
      {/each}
    </div>
    {#if selected !== null}
      <div class="picker" role="group" aria-label={$tx("Viertel wählen")}>
        {#each owned as id (id)}
          <button class="btn" class:here={plan[selected] === id} onclick={() => place(id)}>
            {$loc.building(id).name}{plan.includes(id) && plan[selected] !== id ? " ↺" : ""}
          </button>
        {/each}
        {#if plan[selected] !== null}<button class="btn btn-danger" onclick={() => place(null)}>{$tx("Räumen")}</button>{/if}
      </div>
    {/if}
  </section>
{/if}

<style>
  .hint {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin: 0 0 8px;
  }

  .plan {
    position: relative;
    display: grid;
    gap: 6px;
    padding: 8px;
    max-width: 420px;
    background:
      repeating-linear-gradient(0deg, rgb(255 255 255 / 0.02) 0 1px, transparent 1px 22px),
      linear-gradient(160deg, #2a2219, #17120d);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
  }

  .links {
    position: absolute;
    inset: 8px;
    width: calc(100% - 16px);
    height: calc(100% - 16px);
    pointer-events: none;
  }

  .links line {
    stroke: var(--moss);
    stroke-width: 0.08;
    stroke-linecap: round;
    stroke-dasharray: 0.12 0.08;
  }

  .plot {
    position: relative;
    aspect-ratio: 1.2;
    display: grid;
    place-content: center;
    gap: 2px;
    padding: 2px;
    background: rgb(0 0 0 / 0.35);
    border: 1px dashed var(--border-strong);
    border-radius: 4px;
    color: var(--text-muted);
    font: inherit;
    font-size: 0.7rem;
    overflow: hidden;
  }

  .plot.filled {
    border-style: solid;
    background: linear-gradient(160deg, #3b2d1d, #22190f);
    color: var(--text);
  }

  .plot.selected {
    border-color: var(--focus);
    box-shadow: 0 0 0 1px var(--focus);
  }

  .name {
    font-family: var(--font-display);
    overflow-wrap: anywhere;
    line-height: 1.05;
  }

  .bonus {
    color: var(--moss);
  }

  .empty {
    font-size: 1rem;
    color: var(--text-faint);
  }

  .picker {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }

  .picker .here {
    border-color: var(--gold);
  }
</style>
