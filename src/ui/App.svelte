<script lang="ts">
  import { tx } from "../i18n";
  import type { GameController } from "../app/controller";
  import type { TileId } from "../content/ids";
  import NoticeToast from "./NoticeToast.svelte";
  import ResourceBar from "./ResourceBar.svelte";
  import StoryDialog from "./StoryDialog.svelte";
  import ChoiceDialog from "./ChoiceDialog.svelte";
  import TileMenu from "./TileMenu.svelte";
  import { audio } from "../app/audio";
  import { TILES } from "./tiles/registry";
  import { t } from "../i18n";
  import Scene from "./Scene.svelte";

  let { game }: { game: GameController } = $props();

  const snapshot = $derived(game.snapshot);
  let active = $state<TileId>("keep");
  const activeTile = $derived(TILES.find((t) => t.id === active));
  $effect(() => audio.setMuffled(active === "crypt"));

  /** 1–9 wählt eine Kachel, Leertaste treibt Steuern ein. Nicht in Eingabefeldern oder auf Knöpfen. */
  function onkeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, textarea, select, button, [role=dialog]")) return;
    const index = Number.parseInt(event.key, 10);
    const tile = Number.isInteger(index) ? TILES[index - 1] : undefined;
    if (tile && $snapshot.state.tiles[tile.id]) {
      active = tile.id;
      event.preventDefault();
    } else if (event.key === " ") {
      game.dispatch({ type: "collect" });
      event.preventDefault();
    }
  }
  const actLabel = $derived.by(() => {
    const { flags } = $snapshot.state;
    const ng = $snapshot.state.meta.ngPlus;
    const suffix = ng > 0 ? ` · ${$tx("Neues Spiel+")} ${ng}` : "";
    return $tx(label(flags)) + suffix;
  });

  function label(flags: typeof $snapshot.state.flags): string {
    if (flags.act5Complete) {
      return $snapshot.state.siege.ending === "ash" ? "Ende · Die Asche von Vhal" : "Ende · Das Licht von Vhal";
    }
    if (flags.act4Complete) return "Akt V · Die letzte Glocke";
    if (flags.act3Complete) return "Akt IV · Glaube und Verrat";
    if (flags.act2Complete) return "Akt III · Was unter der Erde liegt";
    if (flags.act1Complete) return "Akt II · Der Graue Orden";
    return "Akt I · Die Ruine";
  }
</script>

<svelte:window {onkeydown} />

<div class="shell">
  <header class="top">
    <div class="brand">
      <h1>{$tx("Die Asche von Vhal")}</h1>
      <p class="act">{actLabel}</p>
    </div>
    <ResourceBar snap={$snapshot} />
  </header>

  <Scene {game} />

  <main class="layout">
    <nav class="menu" aria-label={$tx("Orte der Burg")}>
      <TileMenu snap={$snapshot} {active} onselect={(id) => (active = id)} />
    </nav>

    <section class="panel" aria-labelledby="panel-title">
      {#if activeTile?.Panel}
        {@const Panel = activeTile.Panel}
        <h2 id="panel-title" class="panel-title"><span aria-hidden="true">{activeTile.glyph}</span> {$t(`tile.${activeTile.id}`)}</h2>
        <Panel {game} />
      {:else}
        <h2 id="panel-title" class="panel-title">{$tx("Versiegelt")}</h2>
        <p class="muted">{$tx("Dieser Ort öffnet sich erst später in der Geschichte.")}</p>
      {/if}
    </section>
  </main>
</div>

<StoryDialog {game} />
<ChoiceDialog {game} />
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
    font-size: clamp(1.7rem, 4.5vw, 2.5rem);
    letter-spacing: 0.04em;
    margin: 0;
    background: linear-gradient(180deg, #f0d48a 0%, #c08a35 60%, #8a5a20 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 2px 6px rgb(212 165 74 / 0.25));
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
    position: relative;
    background:
      radial-gradient(ellipse at 50% 0%, rgb(212 165 74 / 0.06), transparent 60%),
      linear-gradient(180deg, #1c1610 0%, #130f0b 100%);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    outline: 1px solid rgb(212 165 74 / 0.12);
    outline-offset: -5px;
    box-shadow: inset 0 0 40px rgb(0 0 0 / 0.55), 0 10px 30px rgb(0 0 0 / 0.45);
    padding: 18px 20px 22px;
    min-height: 420px;
    min-width: 0;
  }

  /* Eckbeschläge aus Messing */
  .panel::before,
  .panel::after {
    content: "";
    position: absolute;
    width: 18px;
    height: 18px;
    border: 2px solid rgb(212 165 74 / 0.45);
    pointer-events: none;
  }

  .panel::before {
    top: 8px;
    left: 8px;
    border-right: none;
    border-bottom: none;
  }

  .panel::after {
    bottom: 8px;
    right: 8px;
    border-left: none;
    border-top: none;
  }

  .panel-title {
    font-family: var(--font-display);
    font-weight: 400;
    font-size: 1.6rem;
    margin: 0 0 16px;
    color: #f0e2c4;
    text-shadow: 0 1px 0 #000;
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
