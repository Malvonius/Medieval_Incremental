<script lang="ts">
  import { tx } from "../../i18n";
  import { loc } from "../../i18n/content";
  import type { GameController } from "../../app/controller";
  import type { StoryNode } from "../../game/story";
  import ProgressSection from "./ProgressSection.svelte";
  import SlotSection from "./SlotSection.svelte";
  import EpilogueDialog from "../EpilogueDialog.svelte";
  import { CLOUD_URL, downloadSave, isValidSyncCode, syncCode, uploadSave } from "../../app/cloud";
  import SettingsSection from "./SettingsSection.svelte";
  import StatsSection from "./StatsSection.svelte";
  import CodexSection from "./CodexSection.svelte";
  import HeraldrySection from "./HeraldrySection.svelte";
  import AutoThreshold from "./AutoThreshold.svelte";
  import { downloadText, qrDataUrls, readFileText, scanQr, scanSupported } from "../saveTransfer";

  let { game }: { game: GameController } = $props();

  const snapshot = $derived(game.snapshot);
  const snap = $derived($snapshot);
  const entries = $derived(
    snap.state.story.completed
      .map((id) => game.storyNode(id))
      .filter((n): n is StoryNode => n !== undefined)
      .reverse(),
  );

  let showEpilogue = $state(false);
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

  function exportFile(): void {
    const date = new Date().toISOString().slice(0, 10);
    downloadText(`vhal-${date}.txt`, game.exportText());
  }

  async function importFile(event: Event & { currentTarget: HTMLInputElement }): Promise<void> {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) game.importText(await readFileText(file));
  }

  let qr = $state<string[]>([]);
  let qrError = $state("");
  async function showQr(): Promise<void> {
    qrError = "";
    try {
      qr = await qrDataUrls(game.exportText());
    } catch {
      qr = [];
      qrError = "Der QR-Code konnte nicht erzeugt werden. Nutze die Datei.";
    }
  }

  async function importQr(event: Event & { currentTarget: HTMLInputElement }): Promise<void> {
    const files = [...(event.currentTarget.files ?? [])];
    event.currentTarget.value = "";
    if (files.length === 0) return;
    const text = await scanQr(files);
    if (text === null) qrError = "Nicht alle Teile des QR-Codes wurden gefunden.";
    else game.importText(text);
  }
</script>

<section class="panel-section">
  <h3 class="section-title">{$tx("Aufzeichnungen")}</h3>
  <ol class="log">
    {#each entries as node, i (node.id)}
      <li>
        <details open={i === 0}>
          <summary><span class="title">{$loc.story(node).title}</span></summary>
          {#each $loc.story(node).text as paragraph, p (p)}
            <p>{paragraph}</p>
          {/each}
        </details>
      </li>
    {/each}
  </ol>
</section>

<StatsSection {game} {snap} />
<CodexSection {snap} />

{#if snap.state.flags.act5Complete}
  <section class="panel-section">
    <h3 class="section-title">{$tx("Epilog")}</h3>
    <button class="btn" onclick={() => (showEpilogue = true)}>{$tx("Den Epilog erzählen")}</button>
  </section>
{/if}
{#if showEpilogue}<EpilogueDialog {game} onclose={() => (showEpilogue = false)} />{/if}

<SlotSection {game} {snap} />
<ProgressSection {game} {snap} />
<section class="panel-section">
  <h3 class="section-title">{$tx("Automatischer Kauf")}</h3>
  <p class="hint">{$tx("Setz bei einem Gebäude das Häkchen „Auto“, dann kauft Vhal es selbst, sobald es günstig genug ist.")}</p>
  <AutoThreshold {game} {snap} />
</section>
<HeraldrySection {snap} />
<SettingsSection />

<section class="panel-section">
  <h3 class="section-title">{$tx("Archiv")}</h3>
  <div class="row">
    <button class="btn" onclick={() => game.save()}>{$tx("Jetzt speichern")}</button>
    <button class="btn" onclick={doExport}>{$tx("Exportieren")}</button>
    {#if copyState === "copied"}<span class="hint">{$tx("In die Zwischenablage kopiert.")}</span>{/if}
    {#if copyState === "failed"}<span class="hint">{$tx("Bitte manuell kopieren.")}</span>{/if}
  </div>
  <div class="row">
    <button class="btn" onclick={exportFile}>{$tx("Als Datei speichern")}</button>
    <label class="btn file">
      {$tx("Datei laden")}
      <input type="file" accept=".txt,text/plain" onchange={importFile} />
    </label>
    <button class="btn" onclick={showQr}>{$tx("QR-Code zeigen")}</button>
    {#if scanSupported()}
      <label class="btn file">
        {$tx("QR-Code einlesen")}
        <input type="file" accept="image/*" multiple onchange={importQr} />
      </label>
    {/if}
  </div>
  {#if qrError}<p class="hint">{$tx(qrError)}</p>{/if}
  {#if qr.length > 0}
    <figure class="qr">
      <div class="codes">
        {#each qr as src, i (src)}
          <img {src} alt={$tx("QR-Code des Spielstands, Teil {i} von {n}", { i: String(i + 1), n: String(qr.length) })} width="200" height="200" />
        {/each}
      </div>
      <figcaption class="hint">{$tx("Jeden Teil mit dem anderen Gerät fotografieren und dort alle Fotos unter „QR-Code einlesen“ wählen.")}</figcaption>
    </figure>
  {/if}
  {#if exported}
    <textarea readonly rows="3" aria-label={$tx("Exportierter Spielstand")} onfocus={(e) => e.currentTarget.select()}>{exported}</textarea>
  {/if}

  {#if CLOUD_URL}
    <div class="row">
      <label class="import inline">
        <span>{$tx("Sync-Code")}</span>
        <input class="code" bind:value={cloudCode} maxlength="12" spellcheck="false" />
      </label>
      <button class="btn" disabled={!isValidSyncCode(cloudCode)} onclick={() => cloud("up")}>{$tx("In die Cloud")}</button>
      <button class="btn" disabled={!isValidSyncCode(cloudCode)} onclick={() => cloud("down")}>{$tx("Aus der Cloud laden")}</button>
      {#if cloudStatus}<span class="hint">{$tx(cloudStatus)}</span>{/if}
    </div>
  {/if}

  <label class="import">
    <span>{$tx("Spielstand importieren")}</span>
    <textarea rows="3" bind:value={importText} placeholder={$tx("Exportierten Text hier einfügen …")}></textarea>
  </label>
  <div class="row">
    <button class="btn" disabled={importText.trim() === ""} onclick={doImport}>{$tx("Importieren")}</button>
    {#if confirmReset}
      <span class="hint">{$tx("Aller Fortschritt geht verloren.")}</span>
      <button class="btn btn-danger" onclick={() => { game.reset(); confirmReset = false; }}>{$tx("Ja, neu beginnen")}</button>
      <button class="btn" onclick={() => (confirmReset = false)}>{$tx("Abbrechen")}</button>
    {:else}
      <button class="btn btn-danger" onclick={() => (confirmReset = true)}>{$tx("Neues Spiel")}</button>
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

  .file {
    position: relative;
    overflow: hidden;
  }

  .file input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  .file:focus-within {
    outline: 2px solid var(--focus);
  }

  .qr {
    margin: 8px 0;
  }

  .codes {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .qr img {
    background: #fff;
    padding: 8px;
    border-radius: var(--radius);
  }
</style>
