<script lang="ts">
  import type { GameController } from "../../app/controller";
  import { EXPEDITIONS, EXPEDITION_IDS, RECRUIT_SWORDS } from "../../content/balance";
  import type { BuyAmount } from "../../game/actions";
  import { expeditionDuration, expeditionLosses, expeditionSlots, recruitCost } from "../../game/rates";
  import { aliveSoldiers } from "../../game/state";
  import { LAUNCH_BLOCKER_TEXT, launchBlocker, maxRecruitable } from "../../game/warroom";
  import { formatDuration, formatNumber, formatPercent } from "../format";
  import BuyAmountToggle from "./BuyAmountToggle.svelte";
  import SiegeSection from "./SiegeSection.svelte";
  import UpgradeList from "./UpgradeList.svelte";

  let { game }: { game: GameController } = $props();

  const snapshot = $derived(game.snapshot);
  const snap = $derived($snapshot);
  let amount = $state<BuyAmount>(1);

  const recruitable = $derived(maxRecruitable(snap.state));
  const count = $derived(amount === "max" ? recruitable : amount);
  const shown = $derived(Math.max(1, count));
  const cost = $derived(recruitCost(snap.state, shown));
  const canRecruit = $derived(count >= 1 && count <= recruitable);
  const alive = $derived(aliveSoldiers(snap.state));
  const slots = $derived(expeditionSlots(snap.state));
</script>

{#if snap.state.flags.act4Complete}
  <SiegeSection {game} {snap} />
{/if}

<section class="panel-section">
  <div class="bar">
    <h3 class="section-title">Rekrutierung</h3>
    <BuyAmountToggle bind:value={amount} />
  </div>
  <div class="recruit">
    <dl class="stats num">
      <div><dt>Lebend</dt><dd>{formatNumber(alive)}</dd></div>
      <div><dt>Bereit</dt><dd>{formatNumber(snap.state.warroom.soldiers)}</dd></div>
      <div><dt>Im Feld</dt><dd>{formatNumber(alive - snap.state.warroom.soldiers)}</dd></div>
      <div><dt>Gefallen</dt><dd class="fallen">{formatNumber(snap.state.warroom.fallen)}</dd></div>
    </dl>
    <button class="btn buy" disabled={!canRecruit} onclick={() => game.dispatch({ type: "recruit", amount: shown })}>
      <span>Rekrutieren ×{shown}</span>
      <span class="cost num">{formatNumber(cost)} Gold · {formatNumber(shown * RECRUIT_SWORDS)} Schwerter</span>
    </button>
  </div>
  <p class="hint">Jeder Soldat braucht ein Schwert und Sold. Lebende Soldaten zählen für den Goldbonus wie Klingen in der Waffenkammer.</p>
</section>

<section class="panel-section">
  <h3 class="section-title">Feldzüge <small class="num">Hauptleute im Feld: {snap.state.warroom.active.length}/{slots}</small></h3>
  <ul class="expeditions">
    {#each EXPEDITION_IDS as id (id)}
      {@const def = EXPEDITIONS[id]}
      {@const blocker = launchBlocker(snap.state, id)}
      {@const running = snap.state.warroom.active.find((e) => e.id === id)}
      {@const duration = expeditionDuration(snap.state, id)}
      <li class="expedition" class:unknown={blocker === "locked"} class:done={blocker === "done"}>
        {#if blocker === "locked"}
          <span class="name">Unbekanntes Ziel</span>
          <p class="desc">Die Gefangenen im Kerker wissen mehr, als sie sagen.</p>
        {:else}
          <div class="head">
            <span class="name">{def.name}</span>
            <span class="meta num">
              {def.soldiers} Soldaten · {formatDuration(duration)} · Verluste {formatPercent(expeditionLosses(snap.state, id, def.soldiers) / def.soldiers)}
            </span>
          </div>
          <p class="desc">{def.description}</p>
          <p class="reward num">
            Beute: ~{formatNumber(snap.rates.gold.mul(def.reward.goldSeconds))} Gold{def.reward.iron > 0
              ? ` · ${formatNumber(def.reward.iron)} Eisen`
              : ""}{def.reward.prisoners > 0 ? ` · ${def.reward.prisoners} Gefangene` : ""}{def.reward.seals > 0
              ? ` · ${def.reward.seals} Ordenssiegel`
              : ""}
          </p>
          {#if running}
            <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round((1 - running.remaining / duration) * 100)}>
              <span class="fill" style:width="{Math.min(100, (1 - running.remaining / duration) * 100)}%"></span>
            </div>
            <p class="status num">Unterwegs – Rückkehr in {formatDuration(running.remaining)}</p>
          {:else if blocker === "done"}
            <p class="status">Gefallen. Grauweiler gehört dir.</p>
          {:else}
            <div class="actions">
              <button
                class="btn"
                disabled={blocker !== null}
                onclick={() => game.dispatch({ type: "launchExpedition", expedition: id })}>Aussenden</button
              >
              {#if blocker !== null}<span class="hint">{LAUNCH_BLOCKER_TEXT[blocker]}</span>{/if}
            </div>
          {/if}
        {/if}
      </li>
    {/each}
  </ul>
</section>

<UpgradeList {game} {snap} tile="warroom" />

<style>
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid var(--border);
  }

  .bar .section-title {
    border: none;
    margin: 0;
  }

  .recruit {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 0 4px;
  }

  .stats {
    display: flex;
    gap: 18px;
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
    font-size: 1.15rem;
  }

  .fallen {
    color: var(--blood-bright);
  }

  .buy {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .cost {
    font-size: 0.82rem;
    color: var(--gold);
  }

  .hint {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin: 4px 0 0;
  }

  small {
    color: var(--text-faint);
    font-family: var(--font-ui);
    font-size: 0.8rem;
  }

  .expeditions {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }

  .expedition {
    background: var(--bg-sunken);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px 14px;
  }

  .expedition.unknown {
    border-style: dashed;
    opacity: 0.7;
  }

  .expedition.done {
    border-color: var(--moss);
  }

  .head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 2px 12px;
    align-items: baseline;
  }

  .name {
    font-family: var(--font-display);
    font-size: 1.1rem;
  }

  .meta,
  .reward {
    font-size: 0.82rem;
    color: var(--text-muted);
  }

  .reward {
    margin: 0 0 8px;
    color: var(--gold);
  }

  .desc {
    margin: 2px 0 4px;
    color: var(--text-muted);
    font-family: var(--font-story);
    font-style: italic;
  }

  .progress {
    position: relative;
    height: 10px;
    border: 1px solid var(--border-strong);
    border-radius: 3px;
    background: var(--bg);
    overflow: hidden;
  }

  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    background: linear-gradient(90deg, var(--blood) 0%, var(--ember) 100%);
  }

  .status {
    margin: 4px 0 0;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  .actions .hint {
    margin: 0;
  }
</style>
