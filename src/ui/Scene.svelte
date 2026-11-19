<script lang="ts">
  import { t, tx } from "../i18n";
  import { bi } from "../i18n/bi";
  import { onMount } from "svelte";
  import type { GameController } from "../app/controller";
  import { settings } from "../app/settings";
  import type { TileId } from "../content/ids";
  import { RAVEN_GIFT_LINE, RAVEN_LINES, RAVEN_WAIT_LINE, SEASONS } from "../content/living";
  import { ravenGift, seasonOf } from "../game/living";
  import { defense } from "../game/rates";
  import { sceneDynamics, sceneKey, sceneModel } from "./scene/model";
  import type { SceneHover, SceneRenderer, SceneTarget } from "./scene/renderer";
  import { formatNumber } from "./format";
  import { floatAt } from "./fx";

  let { game, onselect }: { game: GameController; onselect: (tile: TileId) => void } = $props();

  const snapshot = $derived(game.snapshot);
  let host = $state<HTMLDivElement | null>(null);
  let renderer = $state<SceneRenderer | null>(null);
  let failed = $state(false);
  let hover = $state<SceneHover | null>(null);
  let bubble = $state<{ text: string; x: number; y: number } | null>(null);
  let bubbleTimer: ReturnType<typeof setTimeout> | undefined;
  let lastKey = "";

  const season = $derived(seasonOf($snapshot.state.stats.playSeconds));
  const SEASON_GLYPH = { spring: "❀", summer: "☀", autumn: "❦", winter: "❄" } as const;

  function say(text: string, x: number, y: number): void {
    bubble = { text, x, y };
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => (bubble = null), 3500);
  }

  function select(target: SceneTarget, x: number, y: number): void {
    if (target === "raven") {
      const state = $snapshot.state;
      const gift = state.raven.gift;
      const value = ravenGift($snapshot.rates);
      if (!game.dispatch({ type: "pokeRaven" }).ok) return;
      const rect = host?.getBoundingClientRect();
      if (gift) {
        say($bi(RAVEN_GIFT_LINE), x, y);
        if (rect) floatAt({ x: rect.left + x, y: rect.top + y }, `+${formatNumber(value)} ${$tx("Gold")}`, "gift", 5);
      } else {
        const line = RAVEN_LINES[state.raven.pokes % RAVEN_LINES.length];
        say(line && state.raven.pokes % 3 !== 2 ? $bi(line) : $bi(RAVEN_WAIT_LINE), x, y);
      }
      return;
    }
    onselect(target === "merchant" ? "keep" : target);
  }

  /** Tooltip: Name und Produktion des Ortes unter dem Zeiger. */
  const tooltip = $derived.by(() => {
    if (!hover) return null;
    const { state, rates } = $snapshot;
    const rate = (r: "gold" | "iron" | "souls" | "faith"): string => `+${formatNumber(rates[r])} ${$t(`res.${r}`)}/s`;
    switch (hover.target) {
      case "keep":
        return { title: $t("tile.keep"), detail: rate("gold") };
      case "forge":
        return { title: $t("tile.forge"), detail: `${rate("iron")} · ${formatNumber(state.resources.swords)} ${$t("res.swords")}` };
      case "warroom":
        return { title: $t("tile.warroom"), detail: `${formatNumber(state.warroom.soldiers)} ${$t("res.soldiers")} · ${$t("res.defense")} ${formatNumber(defense(state))}` };
      case "chapel":
        return { title: $t("tile.chapel"), detail: rate("faith") };
      case "crypt":
        return { title: $t("tile.crypt"), detail: rate("souls") };
      case "alchemy":
        return { title: $t("tile.alchemy"), detail: state.alchemy.active ? $tx("Forschung läuft") : $tx("Der Kessel ist kalt") };
      case "raven":
        return { title: $tx("Der Rabe"), detail: state.raven.gift ? $tx("Er hat etwas Glänzendes im Schnabel!") : $tx("Klicken zum Anstupsen") };
      case "merchant":
        return { title: $tx("Der wandernde Händler"), detail: $tx("Angebote im Burgfried") };
      default:
        return { title: $t(`tile.${hover.target}`), detail: "" };
    }
  });

  onMount(() => {
    let disposed = false;
    let instance: SceneRenderer | null = null;
    // PixiJS wird erst hier nachgeladen und landet so in einem eigenen Chunk.
    import("./scene/renderer")
      .then(async ({ SceneRenderer }) => {
        if (disposed || !host) return;
        instance = new SceneRenderer();
        await instance.init(host, {
          onSelect: (target, x, y) => select(target, x, y),
          onHover: (h) => (hover = h),
        });
        if (disposed) instance.destroy();
        else renderer = instance;
      })
      .catch((error: unknown) => {
        // Ohne WebGL/Canvas bleibt das Spiel voll spielbar; nur die Szene fehlt.
        console.warn("Szene konnte nicht starten", error);
        failed = true;
      });
    return () => {
      disposed = true;
      clearTimeout(bubbleTimer);
      instance?.destroy();
    };
  });

  $effect(() => {
    const r = renderer;
    if (!r) return;
    const offSettings = settings.subscribe((s) => r.setAnimate(!s.reduceMotion));
    const offSnapshot = game.snapshot.subscribe((snap) => {
      r.setDynamics(sceneDynamics(snap.state));
      const model = sceneModel(snap.state);
      const key = sceneKey(model);
      if (key === lastKey) return;
      lastKey = key;
      r.update(model);
    });
    const offRitual = game.cues.on("ritual", () => r.playRitual());
    const offStart = game.cues.on("battleStart", () => r.shake(3, 0.6));
    const offEnd = game.cues.on("battleEnd", () => r.shake(5, 1));
    return () => {
      offSettings();
      offSnapshot();
      offRitual();
      offStart();
      offEnd();
      lastKey = "";
    };
  });
</script>

{#if !failed}
  <div class="scene" bind:this={host} role="group" aria-label={$tx("Ansicht von Vhal")}>
    <span class="season" title={$bi(SEASONS[season].summary)}>
      <span aria-hidden="true">{SEASON_GLYPH[season]}</span>
      {$bi(SEASONS[season].name)}<small>&nbsp;· {$bi(SEASONS[season].summary)}</small>
    </span>
    {#if tooltip && hover}
      <div class="tip" style:left="{hover.x}px" style:top="{hover.y}px">
        <strong>{tooltip.title}</strong>
        {#if tooltip.detail}<span class="num">{tooltip.detail}</span>{/if}
      </div>
    {/if}
    {#if bubble}
      <div class="bubble" class:below={bubble.y < 70} style:left="{bubble.x}px" style:top="{bubble.y}px" role="status">{bubble.text}</div>
    {/if}
  </div>
{/if}

<style>
  .scene {
    position: relative;
    height: 240px;
    margin-bottom: 16px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--bg-sunken);
    box-shadow: inset 0 0 40px rgb(0 0 0 / 0.6);
  }

  .season {
    position: absolute;
    right: 8px;
    top: 8px;
    z-index: 2;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgb(10 8 6 / 0.65);
    border: 1px solid var(--border-strong);
    color: var(--text);
    font-size: 0.8rem;
    pointer-events: none;
  }

  .season small {
    color: var(--text-muted);
  }

  .tip,
  .bubble {
    position: absolute;
    z-index: 3;
    transform: translate(-50%, calc(-100% - 8px));
    padding: 4px 8px;
    border-radius: var(--radius);
    background: rgb(20 15 10 / 0.92);
    border: 1px solid var(--gold);
    color: var(--text);
    font-size: 0.8rem;
    white-space: nowrap;
    pointer-events: none;
    display: grid;
    text-align: center;
  }

  .tip strong {
    font-family: var(--font-display);
    color: var(--gold);
  }

  .bubble {
    max-width: 240px;
    white-space: normal;
    font-family: var(--font-story);
    font-size: 0.9rem;
    transform: translate(-10%, calc(-100% - 10px));
  }

  /* Oben im Bild (Rabe auf dem Turm) erscheint die Sprechblase unterhalb. */
  .bubble.below {
    transform: translate(-10%, 40px);
  }

  @media (max-width: 760px) {
    .scene {
      height: 160px;
    }

    .season small {
      display: none;
    }
  }
</style>
