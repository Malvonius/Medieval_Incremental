<script lang="ts">
  import { audio } from "../../app/audio";
  import { requestNotifications } from "../../app/notifications";
  import { LOCALES, type Locale, locale, t, tx } from "../../i18n";
  import { type Notation, settings, updateSettings } from "../../app/settings";

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
  {#if notifyBlocked}<p class="hint">{$tx("Benachrichtigungen wurden vom Browser blockiert.")}</p>{/if}
  <p class="hint">{$tx("Tastatur:")} <kbd>1</kbd>–<kbd>9</kbd> {$tx("wählt einen Ort,")} <kbd>{$tx("Leertaste")}</kbd> {$tx("treibt Steuern ein.")}</p>
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

  kbd {
    border: 1px solid var(--border-strong);
    border-radius: 3px;
    padding: 0 4px;
    font-size: 0.78rem;
  }
</style>
