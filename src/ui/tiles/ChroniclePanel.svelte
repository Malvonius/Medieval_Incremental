<script lang="ts">
  import type { GameController } from "../../app/controller";
  import type { StoryNode } from "../../game/story";
  import { formatDuration, formatNumber } from "../format";
  import ProgressSection from "./ProgressSection.svelte";
  import { CLOUD_URL, downloadSave, isValidSyncCode, syncCode, uploadSave } from "../../app/cloud";
  import SettingsSection from "./SettingsSection.svelte";

  let { game }: { game: GameController } = $props();

  const snapshot = $derived(game.snapshot);
  const snap = $derived($snapshot);
  const entries = $derived(
    snap.state.story.completed
      .map((id) => game.storyNode(id))
      .filter((n): n is StoryNode => n !== undefined)
      .reverse(),
  );

  let exported = $state("");
  let importText = $state("");
  let confirmReset = $state(false);
  let copyState = $state<"idle" | "copied" | "failed">("idle");

  async function doExport(): Promise<void> {
    exported = game.exportText();
    try {
      await navigator.clipboard.writeText(exported);
      copyState = "copied";
    } catch {
      // Zwischenablage nicht erlaubt (z. B. ohne HTTPS) – Text bleibt zum manuellen Kopieren sichtbar.
      copyState = "failed";
    }
  }

  let cloudCode = $state(CLOUD_URL ? syncCode(localStorage) : "");
  let cloudStatus = $state("");
  async function cloud(direction: "up" | "down"): Promise<void> {
    cloudStatus = direction === "up" ? "Lade hoch …" : "Lade herunter …";
    try {
      if (direction === "up") await uploadSave(cloudCode, game.exportText());
      else game.importText(await downloadSave(cloudCode));
      cloudStatus = direction === "up" ? "In der Cloud gesichert." : "Aus der Cloud geladen.";
    } catch (error) {
      cloudStatus = error instanceof Error ? error.message : String(error);
    }
  }

  function doImport(): void {
    if (game.importText(importText).ok) importText = "";
  }
</script>

<section class="panel-section">
  <h3 class="section-title">Aufzeichnungen</h3>
  <ol class="log">
    {#each entries as node, i (node.id)}
      <li>
        <details open={i === 0}>
          <summary><span class="title">{node.title}</span></summary>
          {#each node.text as paragraph, p (p)}
            <p>{paragraph}</p>
          {/each}
        </details>
      </li>
    {/each}
  </ol>
</section>

<section class="panel-section">
  <h3 class="section-title">Statistik</h3>
  <dl class="stats">
    <dt>Spielzeit</dt>
    <dd class="num">{formatDuration(snap.state.stats.playSeconds)}</dd>
    <dt>Steuern eingetrieben</dt>
    <dd class="num">{formatNumber(snap.state.stats.clicks)}×</dd>
    <dt>Gold insgesamt</dt>
    <dd class="num">{formatNumber(snap.state.totals.gold)}</dd>
    <dt>Geschmiedete Klingen</dt>
    <dd class="num">{formatNumber(snap.state.totals.swords)}</dd>
  </dl>
</section>

<ProgressSection {game} {snap} />
<SettingsSection />

<section class="panel-section">
  <h3 class="section-title">Archiv</h3>
  <div class="row">
    <button class="btn" onclick={() => game.save()}>Jetzt speichern</button>
    <button class="btn" onclick={doExport}>Exportieren</button>
    {#if copyState === "copied"}<span class="hint">In die Zwischenablage kopiert.</span>{/if}
    {#if copyState === "failed"}<span class="hint">Bitte manuell kopieren.</span>{/if}
  </div>
  {#if exported}
    <textarea readonly rows="3" aria-label="Exportierter Spielstand" onfocus={(e) => e.currentTarget.select()}>{exported}</textarea>
  {/if}

  {#if CLOUD_URL}
    <div class="row">
      <label class="import inline">
        <span>Sync-Code</span>
        <input class="code" bind:value={cloudCode} maxlength="12" spellcheck="false" />
      </label>
      <button class="btn" disabled={!isValidSyncCode(cloudCode)} onclick={() => cloud("up")}>In die Cloud</button>
      <button class="btn" disabled={!isValidSyncCode(cloudCode)} onclick={() => cloud("down")}>Aus der Cloud laden</button>
      {#if cloudStatus}<span class="hint">{cloudStatus}</span>{/if}
    </div>
  {/if}

  <label class="import">
    <span>Spielstand importieren</span>
    <textarea rows="3" bind:value={importText} placeholder="Exportierten Text hier einfügen …"></textarea>
  </label>
  <div class="row">
    <button class="btn" disabled={importText.trim() === ""} onclick={doImport}>Importieren</button>
    {#if confirmReset}
      <span class="hint">Aller Fortschritt geht verloren.</span>
      <button class="btn btn-danger" onclick={() => { game.reset(); confirmReset = false; }}>Ja, neu beginnen</button>
      <button class="btn" onclick={() => (confirmReset = false)}>Abbrechen</button>
    {:else}
      <button class="btn btn-danger" onclick={() => (confirmReset = true)}>Neues Spiel</button>
    {/if}
  </div>
</section>

<style>
  .log {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 360px;
    overflow-y: auto;
  }

  .log li + li {
    border-top: 1px solid var(--border);
  }

  summary {
    cursor: pointer;
    padding: 6px 0;
  }

  .title {
    font-family: var(--font-display);
    font-size: 1.05rem;
  }

  details p {
    font-family: var(--font-story);
    margin: 0 0 8px;
    color: var(--text-muted);
  }

  .stats {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 4px 16px;
    margin: 0;
  }

  dt {
    color: var(--text-muted);
  }

  dd {
    margin: 0;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 8px 0;
  }

  textarea {
    width: 100%;
    background: var(--bg-sunken);
    color: var(--text);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    padding: 8px;
    font-family: ui-monospace, monospace;
    font-size: 0.8rem;
    resize: vertical;
  }

  .import {
    display: grid;
    gap: 4px;
    margin-top: 12px;
    color: var(--text-muted);
  }

  .import.inline {
    margin: 0;
  }

  .code {
    background: var(--bg-sunken);
    color: var(--text);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    padding: 4px 8px;
    font-family: ui-monospace, monospace;
    width: 14ch;
  }

  .hint {
    color: var(--text-muted);
    font-size: 0.85rem;
  }
</style>
