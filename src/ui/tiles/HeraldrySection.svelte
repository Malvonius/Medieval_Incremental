<script lang="ts">
  import { tx } from "../../i18n";
  import { bi } from "../../i18n/bi";
  import type { Snapshot } from "../../app/controller";
  import { ACHIEVEMENT_IDS } from "../../content/achievements";
  import { CHARGES, CHARGE_ACHIEVEMENTS, type Charge, DIVISIONS, type Division, SCHEMES, SCHEME_IDS, TINCTURES } from "../../content/extensions";
  import { type Heraldry as HeraldryValue, settings, updateSettings } from "../../app/settings";
  import Heraldry from "../Heraldry.svelte";

  let { snap }: { snap: Snapshot } = $props();

  const earned = $derived(ACHIEVEMENT_IDS.filter((id) => snap.state.achievements[id]).length);
  const DIVISION_NAMES: Readonly<Record<Division, string>> = { plain: "Ungeteilt", pale: "Gespalten", fess: "Geteilt", bend: "Schrägrechts geteilt", quarterly: "Geviert", chevron: "Sparren" };
  const CHARGE_NAMES: Readonly<Record<Charge, string>> = { none: "Kein Bild", tower: "Turm", sword: "Schwert", skull: "Schädel", cross: "Kreuz", flame: "Flamme", crown: "Krone" };
  const TINCTURE_NAMES = ["Rot", "Blau", "Grün", "Schwarz", "Purpur", "Gold", "Silber"] as const;

  const set = (patch: Partial<HeraldryValue>): void => updateSettings({ heraldry: { ...$settings.heraldry, ...patch } });
</script>

<section class="panel-section">
  <h3 class="section-title">{$tx("Wappen & Farben")}</h3>
  <p class="hint">{$tx("Erfolge schalten neue Wappenbilder und Farbschemata frei. Bisher: {n}.", { n: String(earned) })}</p>
  <div class="editor">
    <Heraldry heraldry={$settings.heraldry} size={96} label={$tx("Dein Wappen")} />
    <div class="fields">
      {#each [["field", "Feld"], ["second", "Zweite Farbe"], ["chargeColor", "Farbe des Bildes"]] as const as [key, label] (key)}
        <fieldset>
          <legend>{$tx(label)}</legend>
          {#each TINCTURES as color, i (color)}
            <button
              class="swatch"
              class:on={$settings.heraldry[key] === i}
              style:background={color}
              aria-label={$tx(TINCTURE_NAMES[i] ?? "")}
              aria-pressed={$settings.heraldry[key] === i}
              onclick={() => set({ [key]: i })}
            ></button>
          {/each}
        </fieldset>
      {/each}
      <label>
        {$tx("Teilung")}
        <select value={$settings.heraldry.division} onchange={(e) => set({ division: e.currentTarget.value as Division })}>
          {#each DIVISIONS as d (d)}<option value={d}>{$tx(DIVISION_NAMES[d])}</option>{/each}
        </select>
      </label>
      <label>
        {$tx("Wappenbild")}
        <select value={$settings.heraldry.charge} onchange={(e) => set({ charge: e.currentTarget.value as Charge })}>
          {#each CHARGES as c (c)}
            <option value={c} disabled={earned < CHARGE_ACHIEVEMENTS[c]}>
              {$tx(CHARGE_NAMES[c])}{earned < CHARGE_ACHIEVEMENTS[c] ? ` (${CHARGE_ACHIEVEMENTS[c]} ✦)` : ""}
            </option>
          {/each}
        </select>
      </label>
      <label>
        {$tx("Farbschema")}
        <select value={$settings.scheme} onchange={(e) => updateSettings({ scheme: e.currentTarget.value as typeof $settings.scheme })}>
          {#each SCHEME_IDS as id (id)}
            <option value={id} disabled={earned < SCHEMES[id].achievements}>
              {$bi(SCHEMES[id].name)}{earned < SCHEMES[id].achievements ? ` (${SCHEMES[id].achievements} ✦)` : ""}
            </option>
          {/each}
        </select>
      </label>
    </div>
  </div>
</section>

<style>
  .hint {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin: 0 0 8px;
  }

  .editor {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: flex-start;
  }

  .fields {
    display: grid;
    gap: 8px;
    flex: 1;
    min-width: 220px;
  }

  fieldset {
    border: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }

  legend {
    float: left;
    width: 100%;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .swatch {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid var(--border-strong);
    padding: 0;
  }

  .swatch.on {
    border-color: var(--focus);
    box-shadow: 0 0 0 2px var(--bg);
  }

  label {
    display: grid;
    gap: 2px;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  select {
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    padding: 4px;
  }
</style>
