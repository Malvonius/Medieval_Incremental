<script lang="ts">
  import { tx } from "../../i18n";
  import { bi } from "../../i18n/bi";
  import type { Snapshot } from "../../app/controller";
  import { CODEX, CODEX_IDS } from "../../content/extensions";

  let { snap }: { snap: Snapshot } = $props();

  const found = $derived(CODEX_IDS.filter((id) => snap.state.meta.codex[id]).length);
</script>

<section class="panel-section">
  <h3 class="section-title">{$tx("Kodex")} <small class="num">{found}/{CODEX_IDS.length}</small></h3>
  <ul class="codex">
    {#each CODEX_IDS as id (id)}
      <li>
        {#if snap.state.meta.codex[id]}
          <details>
            <summary>{$bi(CODEX[id].title)}</summary>
            <p>{$bi(CODEX[id].text)}</p>
          </details>
        {:else}
          <span class="locked">{$tx("Ein unbeschriebenes Blatt")}</span>
        {/if}
      </li>
    {/each}
  </ul>
</section>

<style>
  .codex {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 6px;
  }

  li {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 6px 8px;
    background: var(--bg-sunken);
  }

  summary {
    cursor: pointer;
    font-family: var(--font-display);
  }

  p {
    font-family: var(--font-story);
    color: var(--text-muted);
    margin: 6px 0 0;
  }

  .locked {
    color: var(--text-muted);
    font-style: italic;
  }
</style>
