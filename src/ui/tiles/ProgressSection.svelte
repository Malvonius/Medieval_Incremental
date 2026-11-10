<script lang="ts">
  import { tx } from "../../i18n";
  import { loc } from "../../i18n/content";
  import type { GameController, Snapshot } from "../../app/controller";
  import { ACHIEVEMENTS, ACHIEVEMENT_BONUS, ACHIEVEMENT_IDS, type AchievementDef } from "../../content/achievements";
  import { achievementCount } from "../../game/achievements";
  import { formatDuration, formatPercent } from "../format";

  let { game, snap }: { game: GameController; snap: Snapshot } = $props();

  const history = $derived(game.history);
  const earned = $derived(achievementCount(snap.state));

  const W = 300;
  const H = 60;
  /** Sparkline über log10(Gold/s): eine Linie, y-Achse logarithmisch. */
  const path = $derived.by(() => {
    const values = $history;
    if (values.length < 2) return "";
    const max = Math.max(...values, 1);
    const stepX = W / (values.length - 1);
    return values.map((v, i) => `${i === 0 ? "M" : "L"}${(i * stepX).toFixed(1)},${(H - (v / max) * H).toFixed(1)}`).join(" ");
  });

  const ROMAN = ["I", "II", "III", "IV", "V"] as const;
  const ACT_FLAGS = ["act1Complete", "act2Complete", "act3Complete", "act4Complete", "act5Complete"] as const;
  /** Dauer je abgeschlossenem Akt aus den Zeitstempeln der Story-Knoten. */
  const actTimes = $derived.by(() => {
    const { completed, completedAt } = snap.state.story;
    const ends: number[] = [];
    completed.forEach((id, i) => {
      const act = Number(id.slice(1, 2));
      const t = completedAt[i] ?? 0;
      if (act >= 1 && act <= 5) ends[act - 1] = Math.max(ends[act - 1] ?? 0, t);
    });
    let prev = 0;
    const rows: { act: string; duration: number }[] = [];
    ends.forEach((end, i) => {
      const flag = ACT_FLAGS[i];
      if (flag === undefined || !snap.state.flags[flag]) return;
      rows.push({ act: ROMAN[i] ?? String(i + 1), duration: Math.max(0, end - prev) });
      prev = end;
    });
    return rows;
  });
</script>

<section class="panel-section">
  <h3 class="section-title">{$tx("Verlauf")}</h3>
  {#if path}
    <svg viewBox="0 0 {W} {H}" class="spark" role="img" aria-label={$tx("Goldproduktion pro Minute, logarithmisch")}>
      <path d={path} />
    </svg>
    <p class="hint">{$tx("Goldproduktion je Spielminute (logarithmisch), seit dem Laden dieser Seite.")}</p>
  {:else}
    <p class="hint">{$tx("Der Verlauf füllt sich mit jeder Spielminute.")}</p>
  {/if}
  {#if actTimes.length > 0}
    <dl class="acts num">
      {#each actTimes as row (row.act)}
        <div><dt>{$tx("Akt")} {row.act}</dt><dd>{formatDuration(row.duration)}</dd></div>
      {/each}
    </dl>
  {/if}
</section>

<section class="panel-section">
  <h3 class="section-title">{$tx("Erfolge")} <small class="num">{earned}/{ACHIEVEMENT_IDS.length} · +{formatPercent(earned * ACHIEVEMENT_BONUS)} {$tx("Produktion")}</small></h3>
  <ul class="achievements">
    {#each ACHIEVEMENT_IDS as id (id)}
      {@const done = snap.state.achievements[id]}
      {@const def: AchievementDef = ACHIEVEMENTS[id]}
      {@const hidden = !done && def.secret === true}
      <li class:done>
        <span class="mark" aria-hidden="true">{done ? "✦" : "·"}</span>
        <span class="name">{hidden ? "???" : $loc.achievement(id).name}</span>
        <span class="desc">{hidden ? $tx("Ein Geheimnis von Vhal.") : $loc.achievement(id).description}</span>
      </li>
    {/each}
  </ul>
</section>

<style>
  .spark {
    width: 100%;
    height: 60px;
    background: var(--bg-sunken);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  .spark path {
    fill: none;
    stroke: var(--gold);
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
  }

  .hint {
    color: var(--text-muted);
    font-size: 0.82rem;
    margin: 4px 0 0;
  }

  .acts {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    margin: 10px 0 0;
  }

  dt {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  dd {
    margin: 0;
  }

  small {
    color: var(--text-faint);
    font-family: var(--font-ui);
    font-size: 0.8rem;
  }

  .achievements {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 6px;
  }

  .achievements li {
    display: grid;
    grid-template-columns: 1em 1fr;
    gap: 0 8px;
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-faint);
  }

  .achievements li.done {
    color: var(--text);
    border-color: var(--gold);
  }

  .done .mark {
    color: var(--gold);
  }

  .name {
    font-family: var(--font-display);
  }

  .desc {
    grid-column: 2;
    font-size: 0.8rem;
    color: var(--text-muted);
  }
</style>
