<script lang="ts">
  import { tx } from "../i18n";
  import type { GameController } from "../app/controller";
  import { formatDuration } from "./format";

  let { game }: { game: GameController } = $props();

  const timelapse = $derived(game.timelapse);
  const share = $derived($timelapse && $timelapse.total > 0 ? $timelapse.done / $timelapse.total : 0);
</script>

{#if $timelapse}
  <div class="backdrop">
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="timelapse-title">
      <h2 id="timelapse-title">{$tx("Zeitraffer")}</h2>
      <p>{$tx("Während du fort warst, ist in Vhal die Zeit nicht stehen geblieben.")}</p>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(share * 100)}>
        <span style:width={`${share * 100}%`}></span>
      </div>
      <p class="num">{formatDuration($timelapse.done)} / {formatDuration($timelapse.total)}</p>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgb(0 0 0 / 0.7);
    z-index: 40;
    padding: 16px;
  }

  .dialog {
    width: min(420px, 100%);
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    padding: 20px;
    box-shadow: var(--shadow);
    text-align: center;
  }

  h2 {
    font-family: var(--font-display);
    margin: 0 0 8px;
  }

  .bar {
    height: 12px;
    background: var(--bg-sunken);
    border: 1px solid var(--border);
    border-radius: 999px;
    overflow: hidden;
  }

  .bar span {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--ember), var(--gold));
  }
</style>
