<script lang="ts">
  import { t, tx } from "../../i18n";
  import type { GameController, Snapshot } from "../../app/controller";
  import { RESOURCE_IDS, type ResourceId } from "../../content/ids";
  import { formatDuration, formatNumber } from "../format";

  let { game, snap }: { game: GameController; snap: Snapshot } = $props();

  const historyAll = $derived(game.historyAll);
  const W = 320;
  const H = 120;
  const PAD = 4;
  const COLORS: Readonly<Record<ResourceId, string>> = {
    gold: "var(--gold)",
    iron: "var(--iron)",
    swords: "var(--blood-bright)",
    souls: "var(--soul)",
    faith: "var(--moss)",
  };
  let shown = $state<Record<ResourceId, boolean>>({ gold: true, iron: true, swords: false, souls: true, faith: true });

  /** Gemeinsame Y-Achse in Zehnerpotenzen, damit alle Ressourcen vergleichbar bleiben. */
  const chart = $derived.by(() => {
    const samples = $historyAll;
    const max = Math.max(1, ...samples.flatMap((s) => RESOURCE_IDS.filter((r) => shown[r]).map((r) => s[r])));
    const x = (i: number): number => PAD + (samples.length < 2 ? 0 : (i / (samples.length - 1)) * (W - 2 * PAD));
    const y = (v: number): number => H - PAD - (v / max) * (H - 2 * PAD);
    const lines = RESOURCE_IDS.filter((r) => shown[r] && samples.some((s) => s[r] > 0)).map((r) => ({
      id: r,
      points: samples.map((s, i) => `${x(i).toFixed(1)},${y(s[r]).toFixed(1)}`).join(" "),
    }));
    return { lines, max: Math.ceil(max), minutes: samples.length };
  });

  const runs = $derived(snap.state.meta.runLog.slice(-12));
  const longestRun = $derived(Math.max(1, ...runs.map((r) => r.seconds)));
  const RUN_LABEL = { ritual: "Ritual", ngplus: "NG+", ascend: "Aufstieg" } as const;
</script>

<section class="panel-section">
  <h3 class="section-title">{$tx("Statistik")}</h3>
  <dl class="stats">
    <dt>{$tx("Spielzeit")}</dt>
    <dd class="num">{formatDuration(snap.state.stats.playSeconds)}</dd>
    <dt>{$tx("Dieser Lauf")}</dt>
    <dd class="num">{formatDuration(snap.state.stats.playSeconds - snap.state.stats.runStart)}</dd>
    <dt>{$tx("Steuern eingetrieben")}</dt>
    <dd class="num">{formatNumber(snap.state.stats.clicks)}×</dd>
    <dt>{$tx("Gold insgesamt")}</dt>
    <dd class="num">{formatNumber(snap.state.totals.gold)}</dd>
    <dt>{$tx("Geschmiedete Klingen")}</dt>
    <dd class="num">{formatNumber(snap.state.totals.swords)}</dd>
    <dt>{$tx("Ereignisse entschieden")}</dt>
    <dd class="num">{formatNumber(snap.state.stats.eventsResolved)}</dd>
  </dl>

  <h4>{$tx("Produktion pro Sekunde (Zehnerpotenzen)")}</h4>
  <div class="legend">
    {#each RESOURCE_IDS as r (r)}
      <label style:--c={COLORS[r]}><input type="checkbox" bind:checked={shown[r]} /> <span class="swatch"></span>{$t(`res.${r}`)}</label>
    {/each}
  </div>
  {#if chart.minutes < 2}
    <p class="hint">{$tx("Nach ein paar Spielminuten erscheint hier der Verlauf.")}</p>
  {:else}
    <svg viewBox="0 0 {W} {H}" role="img" aria-label={$tx("Verlauf der Produktion der letzten {n} Minuten", { n: String(chart.minutes) })}>
      {#each [0.25, 0.5, 0.75] as f (f)}
        <line class="grid" x1={PAD} x2={W - PAD} y1={PAD + f * (H - 2 * PAD)} y2={PAD + f * (H - 2 * PAD)} />
      {/each}
      {#each chart.lines as line (line.id)}
        <polyline points={line.points} style:stroke={COLORS[line.id]} />
      {/each}
      <text x={W - PAD} y="12" text-anchor="end">10^{chart.max}</text>
    </svg>
  {/if}

  {#if runs.length > 0}
    <h4>{$tx("Dauer der letzten Läufe")}</h4>
    <ul class="runs">
      {#each runs as run, i (i)}
        <li>
          <span class="label">{$tx(RUN_LABEL[run.kind])}</span>
          <span class="track"><span class="fill {run.kind}" style:width={`${(run.seconds / longestRun) * 100}%`}></span></span>
          <span class="num">{formatDuration(run.seconds)}</span>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .stats {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 4px 16px;
    margin: 0 0 12px;
  }

  dt,
  .hint {
    color: var(--text-muted);
  }

  dd {
    margin: 0;
  }

  h4 {
    font-family: var(--font-display);
    font-weight: normal;
    margin: 12px 0 4px;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: 0.85rem;
  }

  .swatch {
    display: inline-block;
    width: 10px;
    height: 3px;
    margin-right: 4px;
    vertical-align: middle;
    background: var(--c);
  }

  svg {
    width: 100%;
    max-width: 480px;
    height: auto;
    background: var(--bg-sunken);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  polyline {
    fill: none;
    stroke-width: 2;
    stroke-linejoin: round;
  }

  .grid {
    stroke: var(--border);
    stroke-width: 1;
  }

  text {
    fill: var(--text-faint);
    font-size: 10px;
  }

  .runs {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 4px;
  }

  .runs li {
    display: grid;
    grid-template-columns: 6em 1fr 5em;
    gap: 8px;
    align-items: center;
    font-size: 0.85rem;
  }

  .track {
    height: 8px;
    background: var(--bg-sunken);
    border-radius: 999px;
    overflow: hidden;
  }

  .fill {
    display: block;
    height: 100%;
    background: var(--ember);
  }

  .fill.ngplus {
    background: var(--gold);
  }

  .fill.ascend {
    background: var(--soul);
  }
</style>
