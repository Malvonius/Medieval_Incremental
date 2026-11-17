<script lang="ts">
  import { tx } from "../../i18n";
  import { bi } from "../../i18n/bi";
  import type { GameController } from "../../app/controller";
  import {
    FACTIONS,
    FACTION_IDS,
    OFFICES,
    OFFICE_IDS,
    type OfficeId,
    REPUTATION_BOON,
    REPUTATION_CURSE,
    RETAINERS,
    RETAINER_EQUIP_SWORDS,
    RETAINER_IDS,
    RETAINER_MAX_LEVEL,
    type RetainerId,
  } from "../../content/extensions";
  import { courtCost, levelCost } from "../../game/extensions";
  import { retinueFactor } from "../../game/bonuses";
  import { formatFactor, formatNumber } from "../format";

  let { game }: { game: GameController } = $props();

  const snapshot = $derived(game.snapshot);
  const snap = $derived($snapshot);

  function onOffice(id: RetainerId, value: string): void {
    const office = value === "" ? null : (value as OfficeId);
    game.dispatch({ type: "assignRetainer", retainer: id, office });
  }
</script>

<section class="panel-section">
  <h3 class="section-title">{$tx("Gefolge")}</h3>
  <p class="hint">{$tx("Jede Stufe im Amt bringt +4 %, im Wunschamt doppelt. Ein Schwert an der Seite macht alles noch einmal anderthalbmal so gut.")}</p>
  <ul class="list">
    {#each RETAINER_IDS as id (id)}
      {@const def = RETAINERS[id]}
      {@const r = snap.state.retinue[id]}
      <li class="row" class:hired={r !== null}>
        <div class="who">
          <span class="name">{def.name}</span>
          <span class="trait">{$bi(def.trait)} · {$tx("Wunschamt")}: {$bi(OFFICES[def.affinity].name)}</span>
        </div>
        {#if r === null}
          <button class="btn" disabled={snap.state.resources.gold.lt(def.hireCost)} onclick={() => game.dispatch({ type: "hire", retainer: id })}>
            {$tx("Anheuern")} <span class="num">{formatNumber(def.hireCost)}</span> {$tx("Gold")}
          </button>
        {:else}
          <div class="controls">
            <span class="num level">{$tx("Stufe")} {r.level}/{RETAINER_MAX_LEVEL}</span>
            <label>
              <span class="sr-only">{$tx("Amt")}</span>
              <select value={r.office ?? ""} onchange={(e) => onOffice(id, e.currentTarget.value)}>
                <option value="">{$tx("Ohne Amt")}</option>
                {#each OFFICE_IDS as office (office)}
                  <option value={office}>{$bi(OFFICES[office].name)}</option>
                {/each}
              </select>
            </label>
            {#if r.level < RETAINER_MAX_LEVEL}
              {@const cost = levelCost(snap.state, id)}
              <button class="btn" disabled={snap.state.resources.gold.lt(cost)} onclick={() => game.dispatch({ type: "levelRetainer", retainer: id })}>
                {$tx("Befördern")} <span class="num">{formatNumber(cost)}</span>
              </button>
            {/if}
            {#if !r.equipped}
              <button class="btn" disabled={snap.state.resources.swords.lt(RETAINER_EQUIP_SWORDS)} onclick={() => game.dispatch({ type: "equipRetainer", retainer: id })}>
                {$tx("Ausrüsten")} <span class="num">{RETAINER_EQUIP_SWORDS}</span> ⚔
              </button>
            {:else}
              <span class="tag">⚔ {$tx("ausgerüstet")}</span>
            {/if}
          </div>
        {/if}
      </li>
    {/each}
  </ul>
  <p class="offices">
    {#each OFFICE_IDS as office (office)}
      {@const f = retinueFactor(snap.state, OFFICES[office].resource)}
      {#if f > 1}<span class="tag">{$bi(OFFICES[office].name)} {formatFactor(f)}</span>{/if}
    {/each}
  </p>
</section>

<section class="panel-section">
  <h3 class="section-title">{$tx("Ruf")}</h3>
  <p class="hint">{$tx("Ab +50 segnet dich eine Fraktion, ab −50 verflucht sie dich. Wer eine Seite umwirbt, verärgert ihren Rivalen.")}</p>
  <ul class="list">
    {#each FACTION_IDS as id (id)}
      {@const def = FACTIONS[id]}
      {@const rep = snap.state.factions.rep[id]}
      {@const cost = courtCost(snap.state, id)}
      <li class="faction">
        <div class="who">
          <span class="name">{$bi(def.name)}</span>
          <span class="trait">{$tx("Rivale")}: {$bi(FACTIONS[def.rival].name)} · {$bi(def.boonText)} / {$bi(def.curseText)}</span>
        </div>
        <div class="meter" role="meter" aria-valuemin="-100" aria-valuemax="100" aria-valuenow={rep} aria-label={$bi(def.name)}>
          <span class="fill" class:good={rep >= REPUTATION_BOON} class:bad={rep <= REPUTATION_CURSE} style:left={rep >= 0 ? "50%" : `${50 + rep / 2}%`} style:width={`${Math.abs(rep) / 2}%`}></span>
          <span class="num value">{rep > 0 ? "+" : ""}{rep}</span>
        </div>
        <button class="btn" disabled={snap.state.resources.gold.lt(cost) || rep >= 100} onclick={() => game.dispatch({ type: "court", faction: id })}>
          {$tx("Umwerben")} <span class="num">{formatNumber(cost)}</span>
        </button>
      </li>
    {/each}
  </ul>
</section>

<style>
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }

  .row,
  .faction {
    display: grid;
    gap: 6px;
    padding: 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-sunken);
  }

  .row.hired {
    border-color: var(--border-strong);
  }

  .who {
    display: grid;
  }

  .name {
    font-family: var(--font-display);
  }

  .trait,
  .hint {
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .hint {
    margin: 0 0 8px;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  select {
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    padding: 4px;
  }

  .tag {
    font-size: 0.8rem;
    padding: 2px 6px;
    border: 1px solid var(--border-strong);
    border-radius: 999px;
    color: var(--gold);
  }

  .offices {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 8px 0 0;
  }

  .meter {
    position: relative;
    height: 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 999px;
    overflow: hidden;
  }

  .meter::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--border-strong);
  }

  .fill {
    position: absolute;
    top: 0;
    bottom: 0;
    background: var(--text-faint);
  }

  .fill.good {
    background: var(--moss);
  }

  .fill.bad {
    background: var(--blood);
  }

  .value {
    position: absolute;
    right: 6px;
    top: -2px;
    font-size: 0.75rem;
  }
</style>
