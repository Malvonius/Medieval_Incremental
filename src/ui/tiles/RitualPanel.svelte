<script lang="ts">
  import { tx } from "../../i18n";
  import { loc } from "../../i18n/content";
  import type { GameController } from "../../app/controller";
  import { ASH_BONUS } from "../../content/balance";
  import { ashMultiplier } from "../../game/rates";
  import { ashGain, goldForNextAsh } from "../../game/ritual";
  import { formatNumber, formatPercent } from "../format";
  import { CHALLENGE_IDS, type ChallengeId, MEMORY_BONUS } from "../../content/depth";

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

  const BURNS = ["Gold, Eisen, Schwerter und Seelen", "Alle Gebäude und Verbesserungen", "Soldaten, Gefangene, Fronarbeiter und Befestigungen", "Laufende Expeditionen, Forschung, Schmiedeaufträge und Schlachten"];
  const STAYS = ["Geschichte, Kacheln, Ordenssiegel und abgewehrte Wellen", "Erforschtes Wissen, Hinweise und die Gefallenen in der Krypta", "Glauben und abgelegte Gelübde", "Alle bisher gesammelte Asche"];

  let ngChallenge = $state<ChallengeId | "none">("none");
  let ngConfirm = $state(false);
  function startNewGamePlus(): void {
    ngConfirm = false;
    game.dispatch({ type: "newGamePlus", challenge: ngChallenge === "none" ? null : ngChallenge });
  }

  function perform(): void {
    confirming = false;
    game.dispatch({ type: "ritual" });
  }
</script>

<section class="panel-section">
  <h3 class="section-title">{$tx("Asche")}</h3>
  <dl class="stats num">
    <div><dt>{$tx("Gesammelt")}</dt><dd class="ash">{formatNumber(ritual.ash)}</dd></div>
    <div><dt>{$tx("Bonus")}</dt><dd>×{formatNumber(current)}</dd></div>
    <div><dt>{$tx("Rituale")}</dt><dd>{ritual.performed}</dd></div>
  </dl>
  <p class="hint">{$tx("Jede Asche erhöht die Produktion von Gold, Eisen, Seelen und Glauben um")} {formatPercent(ASH_BONUS)}.</p>
</section>

<section class="panel-section">
  <h3 class="section-title">{$tx("Das Feuer")}</h3>
  <div class="lists">
    <div>
      <h4 class="burns">{$tx("Was verbrennt")}</h4>
      <ul>{#each BURNS as item (item)}<li>{$tx(item)}</li>{/each}</ul>
    </div>
    <div>
      <h4 class="stays">{$tx("Was bleibt")}</h4>
      <ul>{#each STAYS as item (item)}<li>{$tx(item)}</li>{/each}</ul>
    </div>
  </div>

  <div class="ritual">
    <p class="gain num">
      {$tx("Das Ritual bringt jetzt")} <strong>{formatNumber(gain)}</strong> {$tx("Asche")}{gain > 0
        ? ` (${$tx("Bonus danach")} ×${formatNumber(after)})`
        : ""}.
      <span class="next">{$tx("Nächste Asche ab")} {formatNumber(nextAt)} {$tx("Gold in diesem Lauf (bisher")} {formatNumber(snap.state.runTotals.gold)}).</span>
    </p>
    {#if confirming}
      <div class="row">
        <span class="warn">{$tx("Vhal wird bis auf die Grundmauern niederbrennen.")}</span>
        <button class="btn btn-danger" onclick={perform}>{$tx("Entzünden")}</button>
        <button class="btn" onclick={() => (confirming = false)}>{$tx("Abbrechen")}</button>
      </div>
    {:else}
      <button class="btn btn-danger fire" disabled={gain < 1} onclick={() => (confirming = true)}>{$tx("Das Ritual der Asche vollziehen")}</button>
    {/if}
  </div>
</section>

{#if snap.state.flags.act5Complete || snap.state.meta.ngPlus > 0}
  <section class="panel-section">
    <h3 class="section-title">{$tx("Neues Spiel+")}</h3>
    <p class="hint">
      {$tx("Erinnerungen:")} <strong class="num">{snap.state.meta.memories}</strong> (+{formatPercent(snap.state.meta.memories * MEMORY_BONUS)} {$tx("Produktion")}).
      {#if snap.state.meta.challenge}{$tx("Aktive Herausforderung:")} <strong>{$loc.challenge(snap.state.meta.challenge).name}</strong>.{/if}
    </p>
    <ul class="challenges">
      <li>
        <label><input type="radio" bind:group={ngChallenge} value="none" /> {$tx("Ohne Herausforderung")}</label>
      </li>
      {#each CHALLENGE_IDS as id (id)}
        <li class:done={snap.state.meta.challengesDone[id]}>
          <label>
            <input type="radio" bind:group={ngChallenge} value={id} />
            <strong>{$loc.challenge(id).name}</strong> – {$loc.challenge(id).description} {$tx("Belohnung:")} {$loc.challenge(id).rewardText}{snap.state.meta.challengesDone[id] ? " ✓" : ""}
          </label>
        </li>
      {/each}
    </ul>
    {#if snap.state.flags.act5Complete}
      {#if ngConfirm}
        <div class="row">
          <span class="warn">{$tx("Alles beginnt von vorn – nur Erinnerungen, Erfolge und Herausforderungen bleiben.")}</span>
          <button class="btn btn-danger" onclick={startNewGamePlus}>{$tx("Neu beginnen")}</button>
          <button class="btn" onclick={() => (ngConfirm = false)}>{$tx("Abbrechen")}</button>
        </div>
      {:else}
        <button class="btn" onclick={() => (ngConfirm = true)}>{$tx("Neues Spiel+ beginnen (+1 Erinnerung)")}</button>
      {/if}
    {:else}
      <p class="hint">{$tx("Eine Herausforderung gilt als bestanden, wenn du mit ihr ein Ende erreichst.")}</p>
    {/if}
  </section>
{/if}

<style>
  .challenges {
    list-style: none;
    margin: 8px 0 12px;
    padding: 0;
    display: grid;
    gap: 6px;
    font-size: 0.9rem;
    color: var(--text-muted);
  }

  .challenges li.done {
    color: var(--moss);
  }

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
