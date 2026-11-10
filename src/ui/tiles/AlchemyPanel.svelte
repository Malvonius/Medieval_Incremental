<script lang="ts">
  import type { GameController } from "../../app/controller";
  import { RESEARCH, RESEARCH_IDS, type ResearchId } from "../../content/balance";
  import { type ResearchStatus, completedResearchCount, researchStatus } from "../../game/alchemy";
  import { formatDuration, formatNumber } from "../format";

  let { game }: { game: GameController } = $props();

  const snapshot = $derived(game.snapshot);
  const snap = $derived($snapshot);

  /** Stufe = längster Pfad von einer Wurzel; ordnet den Baum in Zeilen. */
  const depthOf = (id: ResearchId): number =>
    RESEARCH[id].requires.reduce((max, req) => Math.max(max, depthOf(req) + 1), 0);
  const TIERS: readonly (readonly ResearchId[])[] = (() => {
    const tiers: ResearchId[][] = [];
    for (const id of RESEARCH_IDS) (tiers[depthOf(id)] ??= []).push(id);
    return tiers;
  })();

  const STATUS_LABEL: Readonly<Record<ResearchStatus, string>> = {
    done: "Erforscht",
    active: "In Arbeit",
    locked: "Verschlossen",
    busy: "Der Turm ist beschäftigt",
    poor: "Zu teuer",
    ready: "Erforschen",
  };

  // Flache Kopie: Der Spielstand wird intern verändert; ein $derived auf dasselbe Objekt würde nie neu auslösen.
  const active = $derived(snap.state.alchemy.active === null ? null : { ...snap.state.alchemy.active });
  const done = $derived(completedResearchCount(snap.state));
</script>

<section class="panel-section">
  <h3 class="section-title">Das große Werk <small class="num">{done}/{RESEARCH_IDS.length}</small></h3>
  {#if active}
    {@const def = RESEARCH[active.id]}
    <div class="current">
      <span class="name">{def.name}</span>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round((1 - active.remaining / def.durationSeconds) * 100)}>
        <span class="fill" style:width="{Math.min(100, (1 - active.remaining / def.durationSeconds) * 100)}%"></span>
      </div>
      <span class="num muted">Noch {formatDuration(active.remaining)}</span>
    </div>
  {:else}
    <p class="muted">Der Kessel ist kalt. Wähle das nächste Werk.</p>
  {/if}
</section>

<section class="panel-section">
  <h3 class="section-title">Forschungsbaum</h3>
  <ol class="tiers">
    {#each TIERS as tier, depth (depth)}
      <li class="tier">
        <span class="tier-label">Stufe {depth + 1}</span>
        <ul class="nodes">
          {#each tier as id (id)}
            {@const def = RESEARCH[id]}
            {@const status = researchStatus(snap.state, id)}
            <li class="node {status}">
              <span class="name">{def.name}</span>
              <span class="desc">{def.description}</span>
              {#if def.requires.length > 0 && status === "locked"}
                <span class="requires">Benötigt: {def.requires.map((r) => RESEARCH[r].name).join(", ")}</span>
              {/if}
              {#if status !== "done"}
                <span class="cost num">
                  {formatNumber(def.gold)} Gold{def.souls > 0 ? ` · ${formatNumber(def.souls)} Seelen` : ""} · {formatDuration(def.durationSeconds)}
                </span>
              {/if}
              <button
                class="btn"
                disabled={status !== "ready"}
                onclick={() => game.dispatch({ type: "research", research: id })}>{STATUS_LABEL[status]}</button
              >
            </li>
          {/each}
        </ul>
      </li>
    {/each}
  </ol>
</section>

<style>
  small {
    color: var(--text-faint);
    font-family: var(--font-ui);
    font-size: 0.8rem;
  }

  .muted {
    color: var(--text-muted);
    margin: 0;
  }

  .current {
    display: grid;
    gap: 6px;
  }

  .progress {
    position: relative;
    height: 12px;
    border: 1px solid var(--border-strong);
    border-radius: 3px;
    background: var(--bg);
    overflow: hidden;
  }

  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    background: linear-gradient(90deg, #2f5a3a 0%, var(--moss) 100%);
  }

  .tiers {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 12px;
  }

  .tier-label {
    display: block;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-faint);
    margin-bottom: 4px;
  }

  .nodes {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 8px;
  }

  .node {
    display: flex;
    flex-direction: column;
    gap: 3px;
    background: var(--bg-sunken);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px 12px;
  }

  .node.locked {
    border-style: dashed;
    opacity: 0.65;
  }

  .node.ready {
    border-color: var(--moss);
  }

  .node.active {
    border-color: var(--gold);
  }

  .node.done {
    border-color: var(--moss);
    background: #121a12;
  }

  .name {
    font-family: var(--font-display);
    font-size: 1.05rem;
  }

  .desc {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .requires {
    font-size: 0.8rem;
    color: var(--text-faint);
    font-style: italic;
  }

  .cost {
    font-size: 0.8rem;
    color: var(--gold);
  }

  .node .btn {
    margin-top: 4px;
    align-self: flex-start;
  }
</style>
