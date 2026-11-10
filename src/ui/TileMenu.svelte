<script lang="ts">
  import type { Snapshot } from "../app/controller";
  import type { TileId } from "../content/ids";
    import { TILES } from "./tiles/registry";

  let {
    snap,
    active,
    onselect,
  }: { snap: Snapshot; active: TileId; onselect: (id: TileId) => void } = $props();
</script>

<ul class="grid">
  {#each TILES as tile (tile.id)}
    {@const unlocked = snap.state.tiles[tile.id]}
    <li>
      <button
        class="tile"
        class:active={active === tile.id}
        class:sealed={!unlocked}
        disabled={!unlocked}
        aria-current={active === tile.id ? "page" : undefined}
        title={unlocked ? tile.title : tile.sealedHint}
        onclick={() => onselect(tile.id)}
      >
        <span class="glyph" aria-hidden="true">{unlocked ? tile.glyph : "?"}</span>
        <span class="label">{unlocked ? tile.title : "Versiegelt"}</span>
      </button>
    </li>
  {/each}
</ul>

<style>
  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .tile {
    width: 100%;
    aspect-ratio: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: linear-gradient(160deg, var(--surface) 0%, var(--bg-sunken) 100%);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    padding: 6px;
    transition: border-color 120ms ease, transform 120ms ease, box-shadow 120ms ease;
  }

  .tile:hover:not(:disabled) {
    border-color: var(--gold);
    transform: translateY(-1px);
  }

  .tile.active {
    border-color: var(--gold);
    box-shadow: inset 0 0 0 1px var(--gold), 0 0 16px rgb(212 165 74 / 0.15);
  }

  .glyph {
    font-size: clamp(1.5rem, 5vw, 2rem);
    line-height: 1;
    color: var(--gold);
  }

  .label {
    font-family: var(--font-display);
    font-size: 0.9rem;
    text-align: center;
    line-height: 1.15;
  }

  .tile.sealed {
    background: var(--bg-sunken);
    border-style: dashed;
    border-color: var(--border);
    opacity: 0.7;
  }

  .tile.sealed .glyph,
  .tile.sealed .label {
    color: var(--text-faint);
  }
</style>
