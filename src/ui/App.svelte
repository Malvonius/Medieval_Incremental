<script lang="ts">
  import type { GameController } from "../app/controller";
  import type { TileId } from "../content/ids";
  import NoticeToast from "./NoticeToast.svelte";
  import ResourceBar from "./ResourceBar.svelte";
  import StoryDialog from "./StoryDialog.svelte";
  import TileMenu from "./TileMenu.svelte";
  import { TILES } from "./tiles/registry";

  let { game }: { game: GameController } = $props();

  const snapshot = $derived(game.snapshot);
  let active = $state<TileId>("keep");
  const activeTile = $derived(TILES.find((t) => t.id === active));
  const actLabel = $derived($snapshot.state.flags.act1Complete ? "Akt I abgeschlossen · Fortsetzung folgt" : "Akt I · Die Ruine");
</script>

<div class="shell">
  <header class="top">
    <div class="brand">
      <h1>Die Asche von Vhal</h1>
      <p class="act">{actLabel}</p>
    </div>
    <ResourceBar snap={$snapshot} />
  </header>

  <main class="layout">
    <nav class="menu" aria-label="Orte der Burg">
      <TileMenu snap={$snapshot} {active} onselect={(id) => (active = id)} />
    </nav>

    <section class="panel" aria-labelledby="panel-title">
      {#if activeTile?.Panel}
        {@const Panel = activeTile.Panel}
        <h2 id="panel-title" class="panel-title"><span aria-hidden="true">{activeTile.glyph}</span> {activeTile.title}</h2>
        <Panel {game} />
      {:else}
        <h2 id="panel-title" class="panel-title">Versiegelt</h2>
        <p class="muted">Dieser Ort öffnet sich erst später in der Geschichte.</p>
      {/if}
    </section>
  </main>
</div>

<StoryDialog {game} />
<NoticeToast {game} />

<style>
  .shell {
    max-width: 1180px;
    margin: 0 auto;
    padding: 16px;
  }

  .top {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px 24px;
    padding-bottom: 12px;
    margin-bottom: 16px;
    border-bottom: 1px solid var(--border);
  }

  h1 {
    font-family: var(--font-display);
    font-weight: 400;
    font-size: clamp(1.6rem, 4vw, 2.2rem);
    margin: 0;
    color: var(--gold);
    text-shadow: 0 0 18px rgb(212 165 74 / 0.25);
  }

  .act {
    margin: 0;
    color: var(--text-muted);
    font-family: var(--font-story);
    font-style: italic;
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(260px, 340px) 1fr;
    gap: 16px;
    align-items: start;
  }

  .panel {
    background: var(--bg-raised);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 18px 20px;
    min-height: 420px;
    min-width: 0;
  }

  .panel-title {
    font-family: var(--font-display);
    font-weight: 400;
    font-size: 1.5rem;
    margin: 0 0 14px;
    color: var(--text);
  }

  .muted {
    color: var(--text-muted);
  }

  @media (max-width: 760px) {
    .layout {
      grid-template-columns: 1fr;
    }
    .panel {
      min-height: 0;
    }
  }
</style>
