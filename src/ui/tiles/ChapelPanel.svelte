<script lang="ts">
  import { tx } from "../../i18n";
  import { loc } from "../../i18n/content";
  import type { GameController } from "../../app/controller";
  import { BUILDINGS, BUILDING_IDS, FAITH_FOR_BETRAYAL, FAITH_FOR_SERMON, VOWS, VOW_IDS } from "../../content/balance";
  import type { BuyAmount } from "../../game/actions";
  import { VOW_BLOCKER_TEXT, swornVows, vowBlocker } from "../../game/chapel";
  import { SYNERGIES } from "../../content/depth";
  import { isBuildingVisible, vowSlots } from "../../game/rates";
  import { formatNumber } from "../format";
  import BuildingRow from "./BuildingRow.svelte";
  import BuyAmountToggle from "./BuyAmountToggle.svelte";
  import UpgradeList from "./UpgradeList.svelte";

  let { game }: { game: GameController } = $props();

  const snapshot = $derived(game.snapshot);
  const snap = $derived($snapshot);
  const CHAPEL_BUILDINGS = BUILDING_IDS.filter((id) => BUILDINGS[id].tile === "chapel");
  let amount = $state<BuyAmount>(1);

  const sworn = $derived(swornVows(snap.state));
  const slots = $derived(vowSlots(snap.state));
  const totalFaith = $derived(snap.state.totals.faith);
  const milestones = $derived([
    { label: "Die Gemeinde hören lassen", need: FAITH_FOR_SERMON },
    { label: "Was verbirgt Ilse Varn?", need: FAITH_FOR_BETRAYAL },
  ]);
</script>

<section class="panel-section">
  <h3 class="section-title">{$tx("Die Gemeinde")}</h3>
  <ul class="milestones">
    {#each milestones as m (m.need)}
      {@const reached = totalFaith.gte(m.need)}
      <li class:reached>
        <span class="mark" aria-hidden="true">{reached ? "✓" : "…"}</span>
        <span class="text">{$tx(m.label)}</span>
        <span class="num need">{formatNumber(Math.min(totalFaith.toNumber(), m.need))} / {formatNumber(m.need)} {$tx("Glauben")}</span>
      </li>
    {/each}
  </ul>
</section>

<section class="panel-section">
  <div class="bar">
    <h3 class="section-title">{$tx("Haus des Glaubens")}</h3>
    <BuyAmountToggle bind:value={amount} />
  </div>
  {#each CHAPEL_BUILDINGS.filter((id) => isBuildingVisible(snap.state, id)) as id (id)}
    <BuildingRow {game} {snap} building={id} {amount} />
  {/each}
</section>

<section class="panel-section">
  <h3 class="section-title">{$tx("Gelübde")} <small class="num">{$tx("Altäre belegt:")} {sworn}/{slots}</small></h3>
  <p class="hint">{$tx("Jedes Gelübde schenkt einen Segen und verlangt einen Fluch. Gelübde überstehen das Ritual der Asche; ein gebrochenes Gelübde gibt keinen Glauben zurück.")}</p>
  <ul class="vows">
    {#each VOW_IDS as id (id)}
      {@const def = VOWS[id]}
      {@const blocker = vowBlocker(snap.state, id)}
      {@const isSworn = snap.state.chapel.vows[id]}
      <li class="vow" class:sworn={isSworn}>
        <span class="name">{$loc.vow(id).name}</span>
        <span class="blessing">✚ {$loc.vow(id).blessing}</span>
        <span class="curse">✖ {$loc.vow(id).curse}</span>
        {#if isSworn}
          <button class="btn btn-danger" onclick={() => game.dispatch({ type: "breakVow", vow: id })}>{$tx("Gelübde brechen")}</button>
        {:else}
          <span class="cost num">{formatNumber(def.faithCost)} {$tx("Glauben")}</span>
          <button
            class="btn"
            disabled={blocker !== null}
            title={blocker === null ? undefined : $tx(VOW_BLOCKER_TEXT[blocker])}
            onclick={() => game.dispatch({ type: "swearVow", vow: id })}>{$tx("Ablegen")}</button
          >
        {/if}
      </li>
    {/each}
  </ul>
</section>

<section class="panel-section">
  <h3 class="section-title">{$tx("Verbindungen")}</h3>
  <ul class="synergies">
    {#each SYNERGIES as syn, si (syn.name)}
      {@const active = snap.state.chapel.vows[syn.vows[0]] && snap.state.chapel.vows[syn.vows[1]]}
      <li class:active>
        <span class="name">{$loc.synergy(si).name}</span>
        <span class="desc">{$loc.vow(syn.vows[0]).name} + {$loc.vow(syn.vows[1]).name}: {$loc.synergy(si).description}</span>
      </li>
    {/each}
  </ul>
</section>

<UpgradeList {game} {snap} tile="chapel" />

<style>
  .milestones {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }

  .milestones li {
    display: grid;
    grid-template-columns: 1.2em 1fr auto;
    gap: 10px;
    align-items: baseline;
    color: var(--text-muted);
  }

  .milestones li.reached {
    color: var(--text);
  }

  .milestones .reached .mark {
    color: var(--moss);
  }

  .text {
    font-family: var(--font-story);
    font-style: italic;
  }

  .need {
    font-size: 0.82rem;
    color: var(--text-faint);
  }

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

  small {
    color: var(--text-faint);
    font-family: var(--font-ui);
    font-size: 0.8rem;
  }

  .hint {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin: 0 0 8px;
  }

  .vows {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 8px;
  }

  .vow {
    display: flex;
    flex-direction: column;
    gap: 3px;
    background: var(--bg-sunken);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px 12px;
  }

  .vow.sworn {
    border-color: var(--gold);
    box-shadow: inset 0 0 0 1px rgb(212 165 74 / 0.25);
  }

  .name {
    font-family: var(--font-display);
    font-size: 1.05rem;
  }

  .blessing {
    color: var(--moss);
    font-size: 0.88rem;
  }

  .curse {
    color: var(--blood-bright);
    font-size: 0.88rem;
  }

  .cost {
    font-size: 0.82rem;
    color: var(--gold);
  }

  .vow .btn {
    margin-top: 4px;
    align-self: flex-start;
  }

  .synergies {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }

  .synergies li {
    display: grid;
    padding: 6px 10px;
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    color: var(--text-faint);
  }

  .synergies li.active {
    border-style: solid;
    border-color: var(--gold);
    color: var(--text);
  }

  .synergies .desc {
    font-size: 0.85rem;
  }

  @media (max-width: 480px) {
    .milestones li {
      grid-template-columns: 1.2em 1fr;
    }
    .need {
      grid-column: 2;
    }
  }
</style>
