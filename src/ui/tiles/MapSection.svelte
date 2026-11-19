<script lang="ts">
  import { tx } from "../../i18n";
  import { bi } from "../../i18n/bi";
  import type { GameController, Snapshot } from "../../app/controller";
  import { MAP, MAP_SIZE, MAP_TILE_BONUS, TERRAINS, type TerrainId } from "../../content/extensions";
  import { conquestStrength, isBorder } from "../../game/extensions";
  import { formatNumber, formatPercent } from "../format";

  let { game, snap }: { game: GameController; snap: Snapshot } = $props();

  const owned = $derived(new Set(snap.state.map.owned));
  const CELL = 100;
  const SIZE = CELL * MAP_SIZE;
  /** Leichtes Zittern der Zeichnung je Feld, damit sie handgemacht wirkt. */
  const jitter = (i: number, k: number): number => (Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 * 6;
  const cx = (i: number): number => (i % MAP_SIZE) * CELL + CELL / 2;
  const cy = (i: number): number => Math.floor(i / MAP_SIZE) * CELL + CELL / 2;

  /** Wege zwischen benachbarten eigenen Feldern. */
  const roads = $derived(
    [...owned].flatMap((a) =>
      [a + 1, a + MAP_SIZE].filter((b) => owned.has(b) && (b !== a + 1 || a % MAP_SIZE !== MAP_SIZE - 1)).map((b) => [a, b] as const),
    ),
  );

  const INK = "#4a3320";
</script>

{#snippet terrain(kind: TerrainId, x: number, y: number, i: number)}
  {#if kind === "keep"}
    <path d="M{x - 16} {y + 18}v-28h6v-6h6v6h8v-6h6v6h6v28z" fill="#8a6a4a" stroke={INK} stroke-width="2" />
    <path d="M{x - 3} {y + 18}v-10a3 3 0 0 1 6 0v10z" fill={INK} />
    <path d="M{x} {y - 16}v-14l12 4-12 4" fill="#a3302a" stroke={INK} stroke-width="1.2" />
  {:else if kind === "field"}
    {#each [0, 1, 2, 3] as r (r)}
      <path d="M{x - 26 + jitter(i, r)} {y - 12 + r * 8}q26 -6 52 0" fill="none" stroke={INK} stroke-width="1.6" />
    {/each}
    <path d="M{x + 14} {y - 20}l2 -8l2 8z" fill={INK} />
  {:else if kind === "mine"}
    <path d="M{x - 24} {y + 16}l14 -26l10 10l8 -14l16 30z" fill="#b8a07a" stroke={INK} stroke-width="2" />
    <path d="M{x - 4} {y + 16}v-8a5 5 0 0 1 10 0v8z" fill={INK} />
  {:else if kind === "forest"}
    {#each [-16, 0, 16] as dx, k (k)}
      <path d="M{x + dx} {y - 18 + (k % 2) * 6}l-9 22h18z" fill="#5a6a3a" stroke={INK} stroke-width="1.6" />
      <path d="M{x + dx} {y + 4 + (k % 2) * 6}v6" stroke={INK} stroke-width="2" />
    {/each}
  {:else if kind === "barrow"}
    <path d="M{x - 24} {y + 14}q24 -34 48 0z" fill="#9a8a6a" stroke={INK} stroke-width="2" />
    <path d="M{x} {y - 12}v-12M{x - 5} {y - 19}h10" stroke={INK} stroke-width="2" />
  {:else}
    <path d="M{x} {y + 18}v-34M{x - 10} {y - 6}h20" stroke={INK} stroke-width="3" />
    <path d="M{x - 8} {y + 18}h16" stroke={INK} stroke-width="2" />
  {/if}
{/snippet}

<section class="panel-section">
  <h3 class="section-title">{$tx("Ländereien")} <small class="num">{owned.size}/{MAP.length}</small></h3>
  <p class="hint">
    {$tx("Erobere angrenzende Felder mit deinen Soldaten. Ein Viertel der nötigen Männer fällt. Jedes Feld stärkt seine Ressource um {bonus}.", { bonus: formatPercent(MAP_TILE_BONUS) })}
  </p>
  <div class="parchment">
    <svg viewBox="-20 -20 {SIZE + 40} {SIZE + 40}" aria-hidden="true">
      <defs>
        <filter id="paper">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="4" seed="7" />
          <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.33  0 0 0 0 0.18  0 0 0 0.35 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <filter id="fog" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="2" />
          <feColorMatrix values="0 0 0 0 0.86  0 0 0 0 0.82  0 0 0 0 0.74  0 0 0 1.4 -0.2" />
          <feComposite in2="SourceGraphic" operator="in" />
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.6" stop-color="#000" stop-opacity="0" />
          <stop offset="1" stop-color="#3a2410" stop-opacity="0.55" />
        </radialGradient>
      </defs>
      <rect x="-20" y="-20" width={SIZE + 40} height={SIZE + 40} rx="18" fill="#dcc79a" />
      <rect x="-20" y="-20" width={SIZE + 40} height={SIZE + 40} rx="18" fill="#fff" filter="url(#paper)" />
      <!-- Wege zwischen eigenen Feldern -->
      {#each roads as [a, b] (`${a}-${b}`)}
        <path d="M{cx(a)} {cy(a)}Q{(cx(a) + cx(b)) / 2 + jitter(a, b)} {(cy(a) + cy(b)) / 2 + jitter(b, a)} {cx(b)} {cy(b)}" fill="none" stroke="#7a5a3a" stroke-width="3" stroke-dasharray="7 6" />
      {/each}
      {#each MAP as kind, i (i)}
        {#if owned.has(i) || isBorder(snap.state, i)}
          {@render terrain(kind, cx(i), cy(i), i)}
        {/if}
        {#if owned.has(i) && kind !== "keep"}
          <path d="M{cx(i) + 28} {cy(i) - 34}v-14l10 4-10 4" fill="#a3302a" stroke={INK} stroke-width="1" />
        {/if}
      {/each}
      <!-- Nebel des Krieges: dicht über Unbekanntem, dünn an der Grenze -->
      {#each MAP as _, i (i)}
        {#if !owned.has(i)}
          <rect
            x={(i % MAP_SIZE) * CELL - 8}
            y={Math.floor(i / MAP_SIZE) * CELL - 8}
            width={CELL + 16}
            height={CELL + 16}
            fill="#fff"
            filter="url(#fog)"
            opacity={isBorder(snap.state, i) ? 0.45 : 0.97}
          />
        {/if}
      {/each}
      <!-- Windrose und Rahmen -->
      <g transform="translate({SIZE - 40} 40)" stroke={INK} fill="none" stroke-width="1.5">
        <circle r="22" />
        <path d="M0 -30 6 0 0 30 -6 0z" fill="#a3302a" />
        <path d="M-30 0 0 6 30 0 0 -6z" fill="#d8c49a" />
      </g>
      <rect x="-20" y="-20" width={SIZE + 40} height={SIZE + 40} rx="18" fill="url(#vignette)" />
      <rect x="-12" y="-12" width={SIZE + 24} height={SIZE + 24} rx="12" fill="none" stroke={INK} stroke-width="2.5" stroke-dasharray="1 0" />
    </svg>
    <div class="cells" style:grid-template-columns="repeat({MAP_SIZE}, 1fr)">
      {#each MAP as kind, i (i)}
        {@const def = TERRAINS[kind]}
        {@const mine = owned.has(i)}
        {@const border = isBorder(snap.state, i)}
        {@const need = border ? conquestStrength(snap.state, i) : 0}
        <button
          class="cell"
          class:border
          class:mine
          disabled={!border || snap.state.warroom.soldiers < need}
          title={mine ? $bi(def.name) : border ? `${$bi(def.name)} – ${$tx("Erobern")}: ${formatNumber(need)} ${$tx("Soldaten")}` : $tx("Unbekanntes Land")}
          aria-label={mine ? `${$bi(def.name)} (${$tx("dein")})` : border ? `${$bi(def.name)}: ${$tx("Erobern")} ${formatNumber(need)}` : $tx("Unbekanntes Land")}
          onclick={() => game.dispatch({ type: "conquer", index: i })}
        >
          {#if border}<span class="need num">⚔ {formatNumber(need)}</span>{/if}
        </button>
      {/each}
    </div>
  </div>
</section>

<style>
  .hint {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin: 0 0 8px;
  }

  .parchment {
    position: relative;
    max-width: 360px;
    aspect-ratio: 1;
    filter: drop-shadow(0 6px 12px rgb(0 0 0 / 0.6));
  }

  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .cells {
    position: absolute;
    /* Innenmaß entspricht dem Kartenraster (20 von 540 Einheiten Rand je Seite). */
    inset: calc(100% * 20 / 540);
    display: grid;
  }

  .cell {
    background: transparent;
    border: 2px solid transparent;
    border-radius: 6px;
    padding: 0;
    display: grid;
    align-items: end;
    justify-items: center;
  }

  .cell.border:not(:disabled) {
    cursor: pointer;
  }

  .cell.border:not(:disabled):hover,
  .cell.border:not(:disabled):focus-visible {
    border-color: #a3302a;
    background: rgb(163 48 42 / 0.12);
  }

  .need {
    font-size: 0.7rem;
    color: #3a2410;
    background: rgb(232 216 176 / 0.85);
    border-radius: 4px;
    padding: 0 3px;
    margin-bottom: 2px;
  }

  .cell.border:disabled .need {
    opacity: 0.7;
  }
</style>
