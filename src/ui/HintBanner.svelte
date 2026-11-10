<script lang="ts">
  import { settings, updateSettings } from "../app/settings";
  import { TILE_HINTS } from "../content/tutorial";
  import type { TileId } from "../content/ids";
  import { tx } from "../i18n";

  let { tile }: { tile: TileId } = $props();

  const visible = $derived(!$settings.hintsSeen.includes(tile));

  function dismiss(): void {
    updateSettings({ hintsSeen: [...$settings.hintsSeen, tile] });
  }
</script>

{#if visible}
  <aside class="hint" aria-label={$tx("Tipp")}>
    <span class="seal" aria-hidden="true">✒</span>
    <p>{$tx(TILE_HINTS[tile])}</p>
    <button class="btn" onclick={dismiss}>{$tx("Verstanden")}</button>
  </aside>
{/if}

<style>
  .hint {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 0 16px;
    padding: 10px 12px;
    border: 1px dashed rgb(212 165 74 / 0.5);
    border-radius: var(--radius);
    background: linear-gradient(90deg, rgb(212 165 74 / 0.1), transparent);
  }

  .seal {
    font-size: 1.3rem;
    color: var(--gold);
  }

  p {
    flex: 1;
    margin: 0;
    font-family: var(--font-story);
    font-size: 1rem;
  }

  @media (max-width: 480px) {
    .hint {
      flex-wrap: wrap;
    }
  }
</style>
