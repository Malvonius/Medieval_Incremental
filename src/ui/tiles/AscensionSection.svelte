<script lang="ts">
  import { tx } from "../../i18n";
  import { bi } from "../../i18n/bi";
  import type { GameController, Snapshot } from "../../app/controller";
  import { TALENTS, TALENT_IDS } from "../../content/extensions";
  import { canAscend, emberGain, talentBlocker } from "../../game/extensions";

  let { game, snap }: { game: GameController; snap: Snapshot } = $props();

  let confirming = $state(false);
  const CELL = 110;
  const ROW = 70;
  const center = (id: keyof typeof TALENTS): [number, number] => {
    const [c, r] = TALENTS[id].pos;
    return [c * CELL + CELL / 2, r * ROW + 24];
  };
  const edges = TALENT_IDS.flatMap((id) => TALENTS[id].requires.map((from) => [center(from), center(id)] as const));

  function ascend(): void {
    confirming = false;
    game.dispatch({ type: "ascend" });
  }
</script>

<section class="panel-section">
  <h3 class="section-title">{$tx("Aufstieg")} <small class="num">{$tx("Glut")}: {snap.state.meta.embers}</small></h3>
  <p class="hint">
    {$tx("Der Aufstieg verbrennt alles, auch Erinnerungen und Asche, und verwandelt sie in Glut. Talente, Enden, Kodex und Erfolge bleiben für immer.")}
  </p>
  {#if canAscend(snap.state)}
    {#if confirming}
      <div class="row">
        <span class="warn">{$tx("Auch die Erinnerungen verglühen.")}</span>
        <button class="btn btn-danger" onclick={ascend}>{$tx("Aufsteigen")}</button>
        <button class="btn" onclick={() => (confirming = false)}>{$tx("Abbrechen")}</button>
      </div>
    {:else}
      <button class="btn btn-danger" onclick={() => (confirming = true)}>{$tx("Aufsteigen (+{n} Glut)", { n: String(emberGain(snap.state)) })}</button>
    {/if}
  {/if}

  <div class="tree" style:height={`${5 * ROW}px`}>
    <svg width={3 * CELL} height={5 * ROW} aria-hidden="true">
      {#each edges as [[x1, y1], [x2, y2]], i (i)}
        <line {x1} {y1} {x2} {y2} />
      {/each}
    </svg>
    {#each TALENT_IDS as id (id)}
      {@const def = TALENTS[id]}
      {@const blocker = talentBlocker(snap.state, id)}
      <button
        class="talent"
        class:owned={blocker === "owned"}
        class:open={blocker === null}
        style:left={`${def.pos[0] * CELL + 4}px`}
        style:top={`${def.pos[1] * ROW}px`}
        style:width={`${CELL - 8}px`}
        disabled={blocker !== null}
        title={$bi(def.description)}
        onclick={() => game.dispatch({ type: "buyTalent", talent: id })}
      >
        <span class="name">{$bi(def.name)}</span>
        <span class="cost num">{blocker === "owned" ? "✓" : `${def.cost} ${$tx("Glut")}`}</span>
      </button>
    {/each}
  </div>
</section>

<style>
  .hint {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin: 0 0 8px;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .warn {
    color: var(--blood-bright);
  }

  .tree {
    position: relative;
    width: 330px;
    max-width: 100%;
    margin-top: 12px;
    overflow-x: auto;
  }

  svg {
    position: absolute;
    inset: 0;
  }

  line {
    stroke: var(--border-strong);
    stroke-width: 2;
  }

  .talent {
    position: absolute;
    display: grid;
    gap: 2px;
    padding: 4px;
    background: var(--bg-sunken);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-muted);
    font: inherit;
    font-size: 0.75rem;
    line-height: 1.1;
  }

  .talent.open {
    border-color: var(--ember);
    color: var(--text);
    cursor: pointer;
  }

  .talent.owned {
    border-color: var(--gold);
    color: var(--gold);
    background: linear-gradient(160deg, #3a2a18, #1a130c);
  }

  .name {
    font-family: var(--font-display);
  }
</style>
