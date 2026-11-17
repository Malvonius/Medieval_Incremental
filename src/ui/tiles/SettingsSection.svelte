<script lang="ts">
  import { audio } from "../../app/audio";
  import { requestNotifications } from "../../app/notifications";
  import { LOCALES, type Locale, locale, t, tx } from "../../i18n";
  import { COMMAND_IDS, type CommandId, DEFAULT_KEYS, type Notation, settings, updateSettings } from "../../app/settings";
  import { voiceSupported } from "../../app/voice";

  const COMMAND_NAMES: Readonly<Record<CommandId, string>> = {
    collect: "Steuern eintreiben",
    save: "Speichern",
    prevTile: "Voriger Ort",
    nextTile: "Nächster Ort",
  };
  let listening = $state<CommandId | null>(null);
  let keyError = $state("");
  const keyLabel = (key: string): string => (key === " " ? "Leertaste" : key.length === 1 ? key.toUpperCase() : key);

  /** Nimmt die nächste Taste als neue Belegung; Ziffern bleiben den Orten vorbehalten, Escape bricht ab. */
  function capture(event: KeyboardEvent, id: CommandId): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape" || event.key === "Tab") {
      listening = null;
      return;
    }
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (/^[0-9]$/.test(key)) {
      keyError = "Ziffern wählen Orte und sind nicht belegbar.";
      return;
    }
    const taken = COMMAND_IDS.find((other) => other !== id && $settings.keys[other] === key);
    if (taken) {
      keyError = "Diese Taste ist schon belegt.";
      return;
    }
    keyError = "";
    listening = null;
    updateSettings({ keys: { ...$settings.keys, [id]: key } });
  }

  const AUTOSAVE = [15, 30, 60] as const;
  let notifyBlocked = $state(false);

  async function toggleNotifications(event: Event & { currentTarget: HTMLInputElement }): Promise<void> {
    const wanted = event.currentTarget.checked;
    if (!wanted) return updateSettings({ notifications: false });
    const allowed = await requestNotifications();
    notifyBlocked = !allowed;
    updateSettings({ notifications: allowed });
  }
</script>

<section class="panel-section">
  <h3 class="section-title">{$t("settings.title")}</h3>
  <div class="grid">
    <label>
      <span>{$t("settings.language")}</span>
      <select value={$locale} onchange={(e) => locale.set(e.currentTarget.value as Locale)}>
        {#each Object.entries(LOCALES) as [code, name] (code)}<option value={code}>{name}</option>{/each}
      </select>
    </label>
    <label>
      <span>{$t("settings.notation")}</span>
      <select value={$settings.notation} onchange={(e) => updateSettings({ notation: e.currentTarget.value as Notation })}>
        <option value="suffix">1,23 Mio.</option>
        <option value="scientific">1,23e6</option>
      </select>
    </label>
    <label>
      <span>{$t("settings.autosave")}</span>
      <select
        value={String($settings.autosaveSeconds)}
        onchange={(e) => updateSettings({ autosaveSeconds: Number(e.currentTarget.value) as 15 | 30 | 60 })}
      >
        {#each AUTOSAVE as s (s)}<option value={String(s)}>{$tx("alle")} {s} s</option>{/each}
      </select>
    </label>
    <label class="check">
      <input type="checkbox" checked={$settings.reduceMotion} onchange={(e) => updateSettings({ reduceMotion: e.currentTarget.checked })} />
      <span>{$t("settings.motion")}</span>
    </label>
    <label class="check">
      <input
        type="checkbox"
        checked={$settings.sound}
        onchange={(e) => {
          updateSettings({ sound: e.currentTarget.checked });
          audio.unlock();
        }}
      />
      <span>{$t("settings.sound")}</span>
    </label>
    <label>
      <span>{$t("settings.volume")}</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={$settings.volume}
        disabled={!$settings.sound}
        oninput={(e) => updateSettings({ volume: Number(e.currentTarget.value) })}
      />
    </label>
  </div>
  <div class="grid">
    <label class="check">
      <input type="checkbox" checked={$settings.music} disabled={!$settings.sound} onchange={(e) => updateSettings({ music: e.currentTarget.checked })} />
      <span>{$tx("Musik")}</span>
    </label>
    <label class="check">
      <input type="checkbox" checked={$settings.notifications} onchange={toggleNotifications} />
      <span>{$tx("Benachrichtigungen im Hintergrund")}</span>
    </label>
    <button class="btn" disabled={$settings.hintsSeen.length === 0} onclick={() => updateSettings({ hintsSeen: [] })}>{$tx("Tipps wieder anzeigen")}</button>
  </div>
  <div class="grid">
    <label class="check">
      <input type="checkbox" checked={$settings.voice} disabled={!voiceSupported()} onchange={(e) => updateSettings({ voice: e.currentTarget.checked })} />
      <span>{$tx("Szenen vorlesen")}</span>
    </label>
  </div>
  <h4>{$tx("Tastenbelegung")}</h4>
  <ul class="keys">
    {#each COMMAND_IDS as id (id)}
      <li>
        <span>{$tx(COMMAND_NAMES[id])}</span>
        {#if listening === id}
          <button class="btn listening" data-capture-keys onkeydown={(e) => capture(e, id)} onblur={() => (listening = null)}>{$tx("Taste drücken …")}</button>
        {:else}
          <button class="btn" onclick={(e) => { listening = id; keyError = ""; const el = e.currentTarget; queueMicrotask(() => el.parentElement?.querySelector<HTMLButtonElement>("[data-capture-keys]")?.focus()); }}>
            <kbd>{$tx(keyLabel($settings.keys[id]))}</kbd>
          </button>
        {/if}
      </li>
    {/each}
  </ul>
  <button class="btn" onclick={() => updateSettings({ keys: DEFAULT_KEYS })}>{$tx("Standardbelegung")}</button>
  {#if keyError}<p class="hint">{$tx(keyError)}</p>{/if}
  {#if notifyBlocked}<p class="hint">{$tx("Benachrichtigungen wurden vom Browser blockiert.")}</p>{/if}
  <p class="hint">{$tx("Tastatur:")} <kbd>1</kbd>–<kbd>9</kbd>, <kbd>0</kbd> {$tx("wählt einen Ort, Pfeiltasten wandern durch das Kachelraster.")} {$tx("Gamepad: Steuerkreuz bewegt, A wählt, B schließt, X treibt Steuern ein.")}</p>
</section>

<style>
  .grid + .grid {
    margin-top: 12px;
  }

  .grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 20px;
    align-items: end;
  }

  label {
    display: grid;
    gap: 4px;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  label.check {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  select {
    background: var(--bg-sunken);
    color: var(--text);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    padding: 4px 8px;
    font: inherit;
  }

  .hint {
    color: var(--text-muted);
    font-size: 0.82rem;
    margin: 10px 0 0;
  }

  h4 {
    font-family: var(--font-display);
    font-weight: normal;
    margin: 14px 0 6px;
  }

  .keys {
    list-style: none;
    margin: 0 0 8px;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 6px;
  }

  .keys li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
  }

  .listening {
    border-color: var(--focus);
  }

  kbd {
    border: 1px solid var(--border-strong);
    border-radius: 3px;
    padding: 0 4px;
    font-size: 0.78rem;
  }
</style>
