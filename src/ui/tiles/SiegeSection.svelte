<script lang="ts">
  import type { GameController, Snapshot } from "../../app/controller";
  import { maxAffordable } from "../../core/economy";
  import { ENDINGS, ENDING_IDS, FORTIFICATIONS, FORTIFICATION_IDS, WAVES } from "../../content/balance";
  import type { BuyAmount } from "../../game/actions";
  import { defense, defenseMultiplier, fortificationCost } from "../../game/rates";
  import { BATTLE_BLOCKER_TEXT, ENDING_BLOCKER_TEXT, battleBlocker, endingBlocker } from "../../game/siege";
  import { formatDuration, formatNumber } from "../format";
  import { RESOURCE_LABELS } from "../labels";
  import BuyAmountToggle from "./BuyAmountToggle.svelte";

  let { game, snap }: { game: GameController; snap: Snapshot } = $props();

  let amount = $state<BuyAmount>(1);
  const wave = $derived(snap.state.siege.wave);
  const next = $derived(WAVES[wave]);
  const power = $derived(defense(snap.state));
  const blocker = $derived(battleBlocker(snap.state));
  const battleRemaining = $derived(snap.state.siege.battle?.remaining ?? null);
  const ending = $derived(snap.state.siege.ending);

  function fortCount(id: (typeof FORTIFICATION_IDS)[number]): number {
    if (amount !== "max") return amount;
    return maxAffordable(FORTIFICATIONS[id].cost, snap.state.siege.fortifications[id], snap.state.resources.gold);
  }
</script>

<section class="panel-section siege">
  <h3 class="section-title">Die Belagerung <small class="num">Wellen abgewehrt: {wave}/{WAVES.length}</small></h3>

  <ol class="waves" aria-label="Wellen">
    {#each WAVES as w, i (w.name)}
      <li class:done={i < wave} class:current={i === wave} class:boss={i === WAVES.length - 1} title={w.name}></li>
    {/each}
  </ol>

  {#if next}
    <div class="front">
      <div class="power">
        <span class="label">Deine Wehrkraft</span>
        <span class="num big" class:ok={power >= next.strength}>{formatNumber(power)}</span>
      </div>
      <div class="enemy">
        <span class="label">{wave === WAVES.length - 1 ? "Der Endgegner" : `Welle ${wave + 1}`}</span>
        <span class="name">{next.name}</span>
        <span class="num">Stärke {formatNumber(next.strength)} · Verluste {Math.round(next.lossRate * 100)} % · {formatDuration(next.durationSeconds)}</span>
      </div>
    </div>

    {#if battleRemaining !== null}
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round((1 - battleRemaining / next.durationSeconds) * 100)}>
        <span class="fill" style:width="{Math.min(100, (1 - battleRemaining / next.durationSeconds) * 100)}%"></span>
      </div>
      <p class="status num">Die Schlacht tobt – noch {formatDuration(battleRemaining)}</p>
    {:else}
      <div class="row">
        <button class="btn fight" disabled={blocker !== null} onclick={() => game.dispatch({ type: "battle" })}>Zur Schlacht</button>
        {#if blocker !== null}<span class="hint">{BATTLE_BLOCKER_TEXT[blocker]}</span>{/if}
      </div>
    {/if}
    <p class="hint">Wehrkraft = Soldaten in der Burg × 10 + Befestigungen, verstärkt durch Upgrades (×{formatNumber(defenseMultiplier(snap.state))}) und Ordenssiegel. Truppen auf Expedition zählen nicht.</p>

    <div class="bar">
      <h4>Befestigungen</h4>
      <BuyAmountToggle bind:value={amount} />
    </div>
    <ul class="forts">
      {#each FORTIFICATION_IDS as id (id)}
        {@const def = FORTIFICATIONS[id]}
        {@const count = fortCount(id)}
        {@const shown = Math.max(1, count)}
        {@const cost = fortificationCost(snap.state, id, shown)}
        <li>
          <div class="info">
            <span class="name">{def.name} <span class="num owned">{snap.state.siege.fortifications[id]}</span></span>
            <span class="desc">{def.description}</span>
            <span class="num yield">je +{formatNumber(def.defense)} Wehrkraft (vor Multiplikatoren)</span>
          </div>
          <button
            class="btn buy"
            disabled={count < 1 || snap.state.resources.gold.lt(cost)}
            onclick={() => game.dispatch({ type: "buildFortification", fortification: id, amount: shown })}
          >
            <span>Bauen ×{shown}</span>
            <span class="cost num">{formatNumber(cost)} Gold</span>
          </button>
        </li>
      {/each}
    </ul>
  {:else if ending === null}
    <p class="story">Der Bischof ist gefallen. Der Stein der Weisen liegt im Schnee. Triff deine Wahl.</p>
    <ul class="endings">
      {#each ENDING_IDS as id (id)}
        {@const def = ENDINGS[id]}
        {@const reason = endingBlocker(snap.state, id)}
        <li class="ending {id}">
          <span class="name">{def.name}</span>
          <span class="desc">{def.description}</span>
          <span class="cost num">{formatNumber(def.cost)} {RESOURCE_LABELS[def.costResource]}</span>
          <button class="btn" disabled={reason !== null} onclick={() => game.dispatch({ type: "chooseEnding", ending: id })}>Wählen</button>
          {#if reason !== null}<span class="hint">{ENDING_BLOCKER_TEXT[reason]}</span>{/if}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="story">{ending === "light" ? "Die letzte Glocke hat geläutet. Vhal ist frei." : "Der Stein gehört dir. Die Toten gehorchen."}</p>
  {/if}
</section>

<style>
  .siege {
    margin-bottom: 20px;
  }

  small {
    color: var(--text-faint);
    font-family: var(--font-ui);
    font-size: 0.8rem;
  }

  .waves {
    list-style: none;
    margin: 0 0 12px;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 4px;
  }

  .waves li {
    height: 8px;
    border-radius: 2px;
    background: var(--bg-sunken);
    border: 1px solid var(--border-strong);
  }

  .waves li.done {
    background: var(--moss);
    border-color: var(--moss);
  }

  .waves li.current {
    border-color: var(--ember);
  }

  .waves li.boss {
    border-color: var(--blood-bright);
  }

  .front {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 8px 20px;
    align-items: start;
    margin-bottom: 10px;
  }

  .label {
    display: block;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }

  .big {
    font-size: 1.6rem;
    color: var(--blood-bright);
  }

  .big.ok {
    color: var(--moss);
  }

  .enemy {
    display: grid;
    gap: 2px;
  }

  .enemy .num {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .name {
    font-family: var(--font-display);
    font-size: 1.1rem;
  }

  .progress {
    position: relative;
    height: 12px;
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

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  .fight {
    font-family: var(--font-display);
    font-size: 1.05rem;
    border-color: var(--blood);
  }

  .hint {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin: 6px 0 0;
  }

  .row .hint {
    margin: 0;
  }

  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 14px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 4px;
  }

  h4 {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 400;
    color: var(--text-muted);
  }

  .forts {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .forts li {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
  }

  .info {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .owned {
    color: var(--gold);
    font-family: var(--font-ui);
    font-size: 0.95rem;
  }

  .desc {
    color: var(--text-muted);
    font-family: var(--font-story);
    font-style: italic;
  }

  .yield {
    font-size: 0.82rem;
    color: var(--text-faint);
  }

  .buy {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    min-width: 132px;
    flex-shrink: 0;
  }

  .cost {
    font-size: 0.82rem;
    color: var(--gold);
  }

  .story {
    font-family: var(--font-story);
    font-size: 1.1rem;
    margin: 0 0 12px;
  }

  .endings {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 10px;
  }

  .ending {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 14px;
    border-radius: var(--radius);
    border: 1px solid var(--border-strong);
  }

  .ending.light {
    background: linear-gradient(180deg, #2a2618 0%, #15130c 100%);
    border-color: #e8d9a8;
  }

  .ending.ash {
    background: linear-gradient(180deg, #1c1a1f 0%, #0d0c0f 100%);
    border-color: var(--soul);
  }

  .ending .btn {
    align-self: flex-start;
    margin-top: 4px;
  }

  @media (max-width: 480px) {
    .front {
      grid-template-columns: 1fr;
    }
    .forts li {
      flex-direction: column;
      align-items: stretch;
    }
    .buy {
      align-items: center;
    }
  }
</style>
