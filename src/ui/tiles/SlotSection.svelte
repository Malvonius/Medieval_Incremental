<script lang="ts">
  import type { GameController, Snapshot } from "../../app/controller";
  import type { SlotNumber } from "../../game/persistence";
  import { tx } from "../../i18n";
  import { formatDuration } from "../format";

  let { game, snap }: { game: GameController; snap: Snapshot } = $props();

  const active = $derived(game.slot);
  // Bei jedem Snapshot neu: der aktive Platz zeigt die laufende Spielzeit.
  const slots = $derived((snap.frame, game.slotSummaries()));
  const ROMAN = ["I", "II", "III", "IV", "V"] as const;
</script>

<section class="panel-section">
  <h3 class="section-title">{$tx("Speicherplätze")}</h3>
  <ul class="slots">
    {#each slots as s (s.slot)}
      {@const isActive = s.slot === $active}
      <li class:active={isActive}>
        <span class="name">{$tx("Platz")} {s.slot}</span>
        <span class="info num">
          {#if s.kind === "empty"}{$tx("Leer")}
          {:else if s.kind === "corrupt"}{$tx("Beschädigt")}
          {:else}{$tx("Akt")} {ROMAN[s.act - 1]} · {formatDuration(s.playSeconds)}{s.ngPlus > 0 ? ` · ${$tx("Neues Spiel+")} ${s.ngPlus}` : ""}{/if}
        </span>
        <button class="btn" disabled={isActive} aria-pressed={isActive} onclick={() => game.switchSlot(s.slot as SlotNumber)}>
          {isActive ? $tx("Aktiv") : $tx("Laden")}
        </button>
      </li>
    {/each}
  </ul>
</section>

<style>
  .slots {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 8px;
  }

  li {
    display: grid;
    gap: 4px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-sunken);
  }

  li.active {
    border-color: var(--gold);
  }

  .name {
    font-family: var(--font-display);
  }

  .info {
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .btn {
    justify-self: start;
  }
</style>
