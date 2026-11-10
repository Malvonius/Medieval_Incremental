<script lang="ts">
  import { tx } from "../i18n";
  import type { GameController } from "../app/controller";
  import { get } from "svelte/store";
  import { locale } from "../i18n";
  import type { Epilogue, InkStep } from "../game/epilogue";

  let { game, onclose }: { game: GameController; onclose: () => void } = $props();

  let epilogue: Epilogue | null = null;
  let lines = $state<string[]>([]);
  let choices = $state<readonly string[]>([]);
  let done = $state(false);
  let error = $state("");

  const apply = (step: InkStep): void => {
    lines = [...lines, ...step.paragraphs];
    choices = step.choices;
    done = step.done;
  };

  // Ink-Laufzeit und Geschichte werden erst beim Öffnen geladen (eigener Chunk), passend zur Sprache.
  const source = get(locale) === "en" ? import("../content/ink/epilog.en.ink") : import("../content/ink/epilog.ink");
  Promise.all([import("../game/epilogue"), source])
    .then(([{ Epilogue }, { default: json }]) => {
      epilogue = new Epilogue(json, get(game.snapshot).state);
      apply(epilogue.next());
    })
    .catch((e: unknown) => (error = e instanceof Error ? e.message : String(e)));

  let box = $state<HTMLDivElement | null>(null);
  $effect(() => {
    if (choices.length > 0 || done) box?.querySelector("button")?.focus();
  });

  function choose(index: number): void {
    if (!epilogue) return;
    lines = [...lines, `› ${choices[index] ?? ""}`];
    apply(epilogue.choose(index));
  }
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && onclose()} />

<div class="backdrop">
  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="epilogue-title" bind:this={box}>
    <h2 id="epilogue-title">{$tx("Epilog")}</h2>
    {#if error}<p class="error">{error}</p>{/if}
    {#each lines as line, i (i)}
      <p class:choice={line.startsWith("›")}>{line}</p>
    {/each}
    <div class="actions">
      {#each choices as label, i (label)}
        <button class="btn" onclick={() => choose(i)}>{label}</button>
      {/each}
      {#if done || error}<button class="btn" onclick={onclose}>{$tx("Schließen")}</button>{/if}
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgb(5 4 3 / 0.8);
    display: grid;
    place-items: center;
    padding: 16px;
    z-index: 25;
  }

  .dialog {
    max-width: 560px;
    width: 100%;
    max-height: calc(100dvh - 32px);
    overflow-y: auto;
    background: linear-gradient(180deg, #221b14 0%, #15110d 100%);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    padding: 22px 24px 18px;
  }

  h2 {
    margin: 0 0 12px;
    font-family: var(--font-display);
    font-weight: 400;
    color: var(--gold);
  }

  p {
    font-family: var(--font-story);
    font-size: 1.05rem;
    line-height: 1.55;
    margin: 0 0 10px;
  }

  p.choice {
    color: var(--text-muted);
    font-style: italic;
  }

  .error {
    color: var(--blood-bright);
  }

  .actions {
    display: grid;
    gap: 8px;
    margin-top: 8px;
  }
</style>
