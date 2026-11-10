<script lang="ts">
  import { tx } from "../i18n";
  import { loc } from "../i18n/content";
  import type { GameController } from "../app/controller";

  let { game }: { game: GameController } = $props();

  const queue = $derived(game.storyQueue);
  const node = $derived($queue[0]);
  const remaining = $derived($queue.length - 1);
  const ACT_NUMERALS = ["I", "II", "III", "IV", "V"] as const;

  let button = $state<HTMLButtonElement | null>(null);
  $effect(() => {
    if (node) button?.focus();
  });

  function onkeydown(event: KeyboardEvent): void {
    if (node && (event.key === "Escape" || event.key === "Enter")) {
      event.preventDefault();
      game.dismissStory();
    }
  }
</script>

<svelte:window {onkeydown} />

{#if node}
  <div class="backdrop">
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="story-title">
      <p class="act">{$tx("Akt")} {ACT_NUMERALS[node.act - 1]}</p>
      <h2 id="story-title">{$loc.story(node).title}</h2>
      {#each $loc.story(node).text as paragraph, i (i)}
        <p class="text">{paragraph}</p>
      {/each}
      <div class="actions">
        <button class="btn" bind:this={button} onclick={() => game.dismissStory()}>
          {remaining > 0 ? `${$tx("Weiter")} (${remaining})` : $tx("Weiter")}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgb(5 4 3 / 0.78);
    backdrop-filter: blur(2px);
    display: grid;
    place-items: center;
    padding: 16px;
    z-index: 20;
  }

  .dialog {
    max-width: 560px;
    width: 100%;
    max-height: calc(100dvh - 32px);
    overflow-y: auto;
    background: linear-gradient(180deg, #221b14 0%, #15110d 100%);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    padding: 24px 26px 20px;
    box-shadow: var(--shadow);
  }

  .act {
    margin: 0;
    font-family: var(--font-display);
    letter-spacing: 0.2em;
    color: var(--blood-bright);
    font-size: 0.85rem;
  }

  h2 {
    margin: 4px 0 14px;
    font-family: var(--font-display);
    font-weight: 400;
    font-size: 1.8rem;
    color: var(--gold);
  }

  .text {
    font-family: var(--font-story);
    font-size: 1.1rem;
    line-height: 1.6;
    margin: 0 0 12px;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }
</style>
