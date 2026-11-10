<script lang="ts">
  import type { GameController } from "../../app/controller";
  import { ASH_BONUS } from "../../content/balance";
  import { ashMultiplier } from "../../game/rates";
  import { ashGain, goldForNextAsh } from "../../game/ritual";
  import { formatNumber, formatPercent } from "../format";

  let { game }: { game: GameController } = $props();

  const snapshot = $derived(game.snapshot);
  const snap = $derived($snapshot);
  // Flache Kopie: Der Spielstand wird intern verändert; ein $derived auf dasselbe Objekt würde nie neu auslösen.
  const ritual = $derived({ ...snap.state.ritual });
  const gain = $derived(ashGain(snap.state));
  const nextAt = $derived(goldForNextAsh(snap.state));
  const current = $derived(ashMultiplier(snap.state));
  const after = $derived(1 + (ritual.ash + gain) * ASH_BONUS);
  let confirming = $state(false);

  const BURNS = ["Gold, Eisen, Schwerter und Seelen", "Alle Gebäude und Verbesserungen", "Soldaten, Gefallene, Gefangene und Fronarbeiter", "Laufende Expeditionen, Forschung und Schmiedeaufträge"];
  const STAYS = ["Geschichte, Kacheln und Ordenssiegel", "Erforschtes Wissen und gesammelte Hinweise", "Glauben und abgelegte Gelübde", "Alle bisher gesammelte Asche"];

  function perform(): void {
    confirming = false;
    game.dispatch({ type: "ritual" });
  }
</script>

<section class="panel-section">
  <h3 class="section-title">Asche</h3>
  <dl class="stats num">
    <div><dt>Gesammelt</dt><dd class="ash">{formatNumber(ritual.ash)}</dd></div>
    <div><dt>Bonus</dt><dd>×{formatNumber(current)}</dd></div>
    <div><dt>Rituale</dt><dd>{ritual.performed}</dd></div>
  </dl>
  <p class="hint">Jede Asche erhöht die Produktion von Gold, Eisen, Seelen und Glauben um {formatPercent(ASH_BONUS)}.</p>
</section>

<section class="panel-section">
  <h3 class="section-title">Das Feuer</h3>
  <div class="lists">
    <div>
      <h4 class="burns">Was verbrennt</h4>
      <ul>{#each BURNS as item (item)}<li>{item}</li>{/each}</ul>
    </div>
    <div>
      <h4 class="stays">Was bleibt</h4>
      <ul>{#each STAYS as item (item)}<li>{item}</li>{/each}</ul>
    </div>
  </div>

  <div class="ritual">
    <p class="gain num">
      Das Ritual bringt jetzt <strong>{formatNumber(gain)}</strong> Asche{gain > 0
        ? ` (Bonus danach ×${formatNumber(after)})`
        : ""}.
      <span class="next">Nächste Asche ab {formatNumber(nextAt)} Gold in diesem Lauf (bisher {formatNumber(snap.state.runTotals.gold)}).</span>
    </p>
    {#if confirming}
      <div class="row">
        <span class="warn">Vhal wird bis auf die Grundmauern niederbrennen.</span>
        <button class="btn btn-danger" onclick={perform}>Entzünden</button>
        <button class="btn" onclick={() => (confirming = false)}>Abbrechen</button>
      </div>
    {:else}
      <button class="btn btn-danger fire" disabled={gain < 1} onclick={() => (confirming = true)}>Das Ritual der Asche vollziehen</button>
    {/if}
  </div>
</section>

<style>
  .stats {
    display: flex;
    gap: 24px;
    margin: 0;
  }

  dt {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }

  dd {
    margin: 0;
    font-size: 1.3rem;
  }

  .ash {
    color: var(--ember);
  }

  .hint {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin: 6px 0 0;
  }

  .lists {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
  }

  h4 {
    margin: 0 0 4px;
    font-family: var(--font-display);
    font-weight: 400;
  }

  .burns {
    color: var(--ember);
  }

  .stays {
    color: var(--moss);
  }

  ul {
    margin: 0;
    padding-left: 18px;
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .ritual {
    margin-top: 16px;
    padding: 12px 14px;
    background: linear-gradient(180deg, #2a140c 0%, #150b07 100%);
    border: 1px solid var(--blood);
    border-radius: var(--radius);
  }

  .gain {
    margin: 0 0 10px;
  }

  .next {
    display: block;
    font-size: 0.82rem;
    color: var(--text-muted);
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  .warn {
    color: var(--blood-bright);
    font-size: 0.9rem;
  }

  .fire {
    font-family: var(--font-display);
    font-size: 1.05rem;
  }
</style>
