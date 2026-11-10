<script lang="ts">
  import { onMount } from "svelte";
  import type { GameController } from "../app/controller";
  import { settings } from "../app/settings";
  import { sceneKey, sceneModel } from "./scene/model";
  import type { SceneRenderer } from "./scene/renderer";

  let { game }: { game: GameController } = $props();

  let host = $state<HTMLDivElement | null>(null);
  let renderer = $state<SceneRenderer | null>(null);
  let failed = $state(false);
  let lastKey = "";

  onMount(() => {
    let disposed = false;
    let instance: SceneRenderer | null = null;
    // PixiJS wird erst hier nachgeladen und landet so in einem eigenen Chunk.
    import("./scene/renderer")
      .then(async ({ SceneRenderer }) => {
        if (disposed || !host) return;
        instance = new SceneRenderer();
        await instance.init(host);
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
      instance?.destroy();
    };
  });

  $effect(() => {
    const r = renderer;
    if (!r) return;
    const offSettings = settings.subscribe((s) => r.setAnimate(!s.reduceMotion));
    const offSnapshot = game.snapshot.subscribe((snap) => {
      const model = sceneModel(snap.state);
      const key = sceneKey(model);
      if (key === lastKey) return;
      lastKey = key;
      r.update(model);
    });
    return () => {
      offSettings();
      offSnapshot();
      lastKey = "";
    };
  });
</script>

{#if !failed}
  <div class="scene" bind:this={host} role="img" aria-label="Ansicht von Vhal"></div>
{/if}

<style>
  .scene {
    height: 150px;
    margin-bottom: 16px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--bg-sunken);
  }

  @media (max-width: 760px) {
    .scene {
      height: 110px;
    }
  }
</style>
