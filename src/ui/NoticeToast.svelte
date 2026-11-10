<script lang="ts">
  import { loc } from "../i18n/content";
  import { tx } from "../i18n";
  import type { GameController } from "../app/controller";
  import { formatDuration, formatNumber } from "./format";

  let { game }: { game: GameController } = $props();

  const notice = $derived(game.notice);
  const DISMISS_MS = { offline: 12_000, info: 4_000, achievement: 4_000, error: 5_000 } as const;

  $effect(() => {
    const current = $notice;
    if (!current) return;
    const handle = setTimeout(() => game.dismissNotice(), DISMISS_MS[current.kind]);
    return () => clearTimeout(handle);
  });
</script>

{#if $notice}
  <div class="toast {$notice.kind}" role={$notice.kind === "error" ? "alert" : "status"}>
    {#if $notice.kind === "offline"}
      <strong>{$tx("Während deiner Abwesenheit")}</strong>
      {@const r = $notice.report}
      <p>
        {r.gains.iron.gt(0)
          ? $tx("Du warst {time} fort. Deine Leute haben {gold} Gold erwirtschaftet und {iron} Eisen gefördert.", {
              time: formatDuration(r.awaySeconds),
              gold: formatNumber(r.gains.gold),
              iron: formatNumber(r.gains.iron),
            })
          : $tx("Du warst {time} fort. Deine Leute haben {gold} Gold erwirtschaftet.", {
              time: formatDuration(r.awaySeconds),
              gold: formatNumber(r.gains.gold),
            })}
      </p>
    {:else if $notice.kind === "achievement"}
      <p>{$tx("Erfolg:")} {$loc.achievement($notice.id).name} (+1 % {$tx("Produktion")})</p>
    {:else}
      <p>{$tx($notice.message)}</p>
    {/if}
    <button class="close" aria-label={$tx("Meldung schließen")} onclick={() => game.dismissNotice()}>×</button>
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    right: 16px;
    bottom: 16px;
    left: 16px;
    margin-left: auto;
    max-width: 380px;
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-left: 3px solid var(--gold);
    border-radius: var(--radius);
    padding: 10px 36px 10px 14px;
    box-shadow: var(--shadow);
    z-index: 30;
  }

  .toast.error {
    border-left-color: var(--blood-bright);
  }

  p {
    margin: 2px 0 0;
  }

  .close {
    position: absolute;
    top: 4px;
    right: 6px;
    background: none;
    border: none;
    font-size: 1.3rem;
    color: var(--text-muted);
    line-height: 1;
    padding: 4px;
  }
</style>
