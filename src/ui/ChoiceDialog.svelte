<script lang="ts">
  import { tx } from "../i18n";
  import type { GameController } from "../app/controller";
  import { loc } from "../i18n/content";
  import { decisionOpen } from "../game/depth";

  let { game }: { game: GameController } = $props();

  const snapshot = $derived(game.snapshot);
  const queue = $derived(game.storyQueue);
  /** Story-Texte haben Vorrang; danach Entscheidungen, dann Zufallsereignisse. */
  const view = $derived.by(() => {
    if ($queue.length > 0) return null;
    const s = $snapshot.state;
    if (decisionOpen(s, "trust")) {
      const d = $loc.trust();
      return { kind: "decision" as const, title: d.title, text: d.text, choices: d.options };
    }
    const id = s.events.pending;
    if (id === null) return null;
    const e = $loc.event(id);
    return { kind: "event" as const, title: e.title, text: e.text, choices: e.choices };
  });

  function choose(index: number): void {
    if (!view) return;
    if (view.kind === "event") game.dispatch({ type: "resolveEvent", choice: index });
    else game.dispatch({ type: "decide", decision: "trust", option: index === 0 ? 0 : 1 });
  }
</script>

{#if view}
  <div class="backdrop">
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="choice-title">
      <p class="kind">{$tx(view.kind === "event" ? "Ereignis" : "Entscheidung")}</p>
      <h2 id="choice-title">{view.title}</h2>
      <p class="text">{view.text}</p>
      <div class="choices">
        {#each view.choices as label, i (label)}
          <button class="btn" onclick={() => choose(i)}>{label}</button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgb(5 4 3 / 0.7);
    display: grid;
    place-items: center;
    padding: 16px;
    z-index: 19;
  }

  .dialog {
    max-width: 520px;
    width: 100%;
    background: linear-gradient(180deg, #221b14 0%, #15110d 100%);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    padding: 22px 24px 18px;
    box-shadow: var(--shadow);
  }

  .kind {
    margin: 0;
    font-family: var(--font-display);
    letter-spacing: 0.2em;
    color: var(--ember);
    font-size: 0.85rem;
  }

  h2 {
    margin: 4px 0 10px;
    font-family: var(--font-display);
    font-weight: 400;
    font-size: 1.6rem;
    color: var(--gold);
  }

  .text {
    font-family: var(--font-story);
    font-size: 1.05rem;
    line-height: 1.55;
  }

  .choices {
    display: grid;
    gap: 8px;
  }

  .choices .btn {
    text-align: left;
  }
</style>
