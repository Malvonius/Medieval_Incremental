<script lang="ts">
  import { TINCTURES } from "../content/extensions";
  import type { Heraldry } from "../app/settings";

  let { heraldry, size = 64, label = "" }: { heraldry: Heraldry; size?: number; label?: string } = $props();

  const color = (i: number): string => TINCTURES[i] ?? TINCTURES[0];
  /** Schildform im 100×120-Raster; alle Teilungen werden darauf zugeschnitten. */
  const SHIELD = "M5 5 H95 V55 C95 90 70 108 50 116 C30 108 5 90 5 55 Z";
  const uid = $props.id();
</script>

<svg width={size} height={size * 1.2} viewBox="0 0 100 120" role={label ? "img" : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : "true"}>
  <defs><clipPath id="shield-{uid}"><path d={SHIELD} /></clipPath></defs>
  <g clip-path="url(#shield-{uid})">
    <rect width="100" height="120" fill={color(heraldry.field)} />
    {#if heraldry.division === "pale"}
      <rect x="50" width="50" height="120" fill={color(heraldry.second)} />
    {:else if heraldry.division === "fess"}
      <rect y="55" width="100" height="65" fill={color(heraldry.second)} />
    {:else if heraldry.division === "bend"}
      <polygon points="0,0 100,120 0,120" fill={color(heraldry.second)} />
    {:else if heraldry.division === "quarterly"}
      <rect x="50" width="50" height="55" fill={color(heraldry.second)} />
      <rect y="55" width="50" height="65" fill={color(heraldry.second)} />
    {:else if heraldry.division === "chevron"}
      <polygon points="0,95 50,45 100,95 100,120 0,120" fill={color(heraldry.second)} />
    {/if}
  </g>
  <g fill={color(heraldry.chargeColor)} stroke="#0008" stroke-width="1.5">
    {#if heraldry.charge === "tower"}
      <path d="M32 88 V48 H38 V40 H44 V48 H56 V40 H62 V48 H68 V88 Z M46 88 V72 A4 4 0 0 1 54 72 V88 Z" fill-rule="evenodd" />
    {:else if heraldry.charge === "sword"}
      <path d="M48 22 H52 V74 H48 Z M36 74 H64 V80 H36 Z M47 80 H53 V94 H47 Z M45 94 H55 V100 H45 Z" />
    {:else if heraldry.charge === "skull"}
      <path d="M50 34 C33 34 30 50 33 60 C35 66 38 66 38 74 H62 C62 66 65 66 67 60 C70 50 67 34 50 34 Z M42 52 A5 5 0 1 0 42.1 52 Z M58 52 A5 5 0 1 0 58.1 52 Z M44 78 H56 V84 H44 Z" fill-rule="evenodd" />
    {:else if heraldry.charge === "cross"}
      <path d="M44 28 H56 V50 H74 V62 H56 V96 H44 V62 H26 V50 H44 Z" />
    {:else if heraldry.charge === "flame"}
      <path d="M50 26 C58 42 70 50 66 70 C64 84 56 92 50 92 C42 92 34 84 34 72 C34 60 42 56 44 46 C48 54 50 56 52 58 C54 50 52 38 50 26 Z" />
    {:else if heraldry.charge === "crown"}
      <path d="M28 76 L32 46 L42 60 L50 40 L58 60 L68 46 L72 76 Z M28 80 H72 V88 H28 Z" />
    {/if}
  </g>
  <path d={SHIELD} fill="none" stroke="#d4a54a" stroke-width="3" />
</svg>
