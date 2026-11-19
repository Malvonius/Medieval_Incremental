<script lang="ts">
  import type { TileId } from "../content/ids";

  /** Kleine animierte Bilder für die Kacheln; Bewegung nur, solange keine reduzierte Bewegung gewünscht ist. */
  let { tile }: { tile: TileId } = $props();
</script>

<svg class="icon" viewBox="0 0 48 48" aria-hidden="true">
  <defs>
    <linearGradient id="stone-{tile}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#a39886" />
      <stop offset="1" stop-color="#5a5246" />
    </linearGradient>
    <radialGradient id="fire-{tile}" cx="0.5" cy="0.8" r="0.7">
      <stop offset="0" stop-color="#fff2a8" />
      <stop offset="0.45" stop-color="#ff9a3a" />
      <stop offset="1" stop-color="#a3302a" stop-opacity="0" />
    </radialGradient>
  </defs>
  {#if tile === "keep"}
    <path d="M12 44V16h4v-4h4v4h8v-4h4v4h4v28z" fill="url(#stone-{tile})" stroke="#2a221a" />
    <path d="M21 44v-9a3 3 0 0 1 6 0v9z" fill="#1a120c" />
    <rect x="23.5" y="2" width="1.2" height="12" fill="#3a2a1c" />
    <path class="anim flag" d="M24.7 3h11l-3 3 3 3h-11z" fill="#a3302a" />
  {:else if tile === "forge"}
    <path d="M8 40h32l-4 4H12z" fill="#2a2a2e" />
    <path d="M14 40h20v-4H14z" fill="#3a3a40" />
    <path class="anim flame" d="M24 8c4 6 9 10 8 18-1 6-5 9-8 9s-8-3-8-9c0-5 4-7 5-11 2 3 2 5 3 6 1-4 1-8 0-13z" fill="url(#fire-{tile})" />
    <circle class="anim spark s1" cx="30" cy="14" r="1" fill="#ffd06a" />
    <circle class="anim spark s2" cx="18" cy="12" r="0.8" fill="#ffd06a" />
  {:else if tile === "warroom"}
    <g class="anim clash">
      <path d="M10 38 34 8l3 2-24 30z" fill="#c8ccd4" />
      <path d="M38 38 14 8l-3 2 24 30z" fill="#aeb4be" />
    </g>
    <path d="M8 36l6 6M40 36l-6 6" stroke="#6a4a2a" stroke-width="4" stroke-linecap="round" />
    <circle class="anim glint" cx="24" cy="22" r="2" fill="#fff" />
  {:else if tile === "dungeon"}
    <g class="anim swing">
      <path d="M24 4v10" stroke="#7a7a80" stroke-width="2" />
      {#each [0, 1, 2] as i (i)}
        <ellipse cx="24" cy={18 + i * 8} rx="4" ry="5" fill="none" stroke="#9aa0a8" stroke-width="2.4" />
      {/each}
      <path d="M16 42h16l-2-6H18z" fill="#5a5a62" />
    </g>
  {:else if tile === "crypt"}
    <path d="M14 30c0-10 4-16 10-16s10 6 10 16v4H14z" fill="#d8d2c4" />
    <circle cx="20" cy="26" r="3" fill="#1a1410" />
    <circle cx="28" cy="26" r="3" fill="#1a1410" />
    <path d="M22 34v4M26 34v4M18 34v3M30 34v3" stroke="#d8d2c4" stroke-width="2" />
    {#each [0, 1, 2, 3] as i (i)}
      <circle class="anim dust" style:animation-delay="{i * 0.6}s" cx={12 + i * 8} cy="4" r="0.9" fill="#b8b0a0" />
    {/each}
  {:else if tile === "alchemy"}
    <path d="M20 6h8v12l10 18a4 4 0 0 1-4 6H14a4 4 0 0 1-4-6l10-18z" fill="#2a3a3a" stroke="#8ab0a0" />
    <path d="M13 32h22l3 5a3 3 0 0 1-3 4H13a3 3 0 0 1-3-4z" fill="#4adf7a" opacity="0.85" />
    {#each [0, 1, 2] as i (i)}
      <circle class="anim bubble" style:animation-delay="{i * 0.7}s" cx={20 + i * 4} cy="36" r="1.6" fill="#b8ffd0" />
    {/each}
  {:else if tile === "chapel"}
    <path d="M24 2v8M20 5h8" stroke="#d4a54a" stroke-width="2" />
    <g class="anim bell">
      <path d="M14 34c0-12 4-20 10-20s10 8 10 20z" fill="#c89a3a" stroke="#6a4a1a" />
      <path d="M12 34h24v3H12z" fill="#a37a2a" />
      <circle cx="24" cy="40" r="2.5" fill="#6a4a1a" />
    </g>
  {:else if tile === "ritual"}
    <g class="anim spin">
      <circle cx="24" cy="24" r="18" fill="none" stroke="#5a4a3a" stroke-width="2" stroke-dasharray="4 3" />
      <path d="M24 8l4 12 12 4-12 4-4 12-4-12-12-4 12-4z" fill="none" stroke="#e07b39" stroke-width="1.5" />
    </g>
    <circle class="anim ember" cx="24" cy="24" r="4" fill="url(#fire-{tile})" />
  {:else if tile === "hall"}
    <path d="M10 34l3-18 7 9 4-13 4 13 7-9 3 18z" fill="#d4a54a" stroke="#7a5a1a" />
    <path d="M10 34h28v5H10z" fill="#a37a2a" />
    <circle class="anim gem" cx="24" cy="36.5" r="2" fill="#c8304a" />
    <circle class="anim gem" style:animation-delay="0.4s" cx="16" cy="36.5" r="1.4" fill="#3a6ad0" />
    <circle class="anim gem" style:animation-delay="0.8s" cx="32" cy="36.5" r="1.4" fill="#3a6ad0" />
  {:else}
    <path d="M8 10c6-2 12-1 16 2v30c-4-3-10-4-16-2z" fill="#d8c9a4" />
    <path d="M40 10c-6-2-12-1-16 2v30c4-3 10-4 16-2z" fill="#c8b890" />
    <path d="M12 18h8M12 22h8M12 26h6M28 18h8M28 22h8" stroke="#6a5a3a" stroke-width="1" />
    <path class="anim quill" d="M30 30 42 4l1 1-10 27z" fill="#e8e0d0" stroke="#8a7a5a" stroke-width="0.6" />
  {/if}
</svg>

<style>
  .icon {
    width: clamp(1.9rem, 6vw, 2.6rem);
    height: auto;
    filter: drop-shadow(0 1px 0 #000) drop-shadow(0 0 6px rgb(212 165 74 / 0.25));
  }

  .anim {
    transform-box: fill-box;
  }

  .flag {
    transform-origin: left center;
    animation: wave 1.6s ease-in-out infinite;
  }

  .flame {
    transform-origin: 50% 100%;
    animation: flicker 0.9s ease-in-out infinite alternate;
  }

  .spark {
    animation: rise 1.4s ease-out infinite;
  }

  .s2 {
    animation-delay: 0.7s;
  }

  .clash {
    transform-origin: center;
    animation: clash 2.4s ease-in-out infinite;
  }

  .glint {
    animation: glint 2.4s ease-in-out infinite;
  }

  .swing {
    transform-origin: 50% 0%;
    animation: swing 2.2s ease-in-out infinite alternate;
  }

  .dust {
    animation: fall 2.4s linear infinite;
  }

  .bubble {
    animation: bubble 2.1s ease-in infinite;
  }

  .bell {
    transform-origin: 50% 0%;
    animation: swing 1.4s ease-in-out infinite alternate;
  }

  .spin {
    transform-origin: center;
    animation: spin 12s linear infinite;
  }

  .ember {
    transform-origin: center;
    animation: pulse 1.6s ease-in-out infinite alternate;
  }

  .gem {
    animation: glint 2s ease-in-out infinite;
  }

  .quill {
    transform-origin: 0% 100%;
    animation: write 1.8s ease-in-out infinite alternate;
  }

  @keyframes wave {
    50% {
      transform: skewY(6deg) scaleX(0.92);
    }
  }

  @keyframes flicker {
    from {
      transform: scale(0.94, 0.9);
      opacity: 0.85;
    }
    to {
      transform: scale(1.04, 1.08);
      opacity: 1;
    }
  }

  @keyframes rise {
    from {
      transform: translateY(6px);
      opacity: 1;
    }
    to {
      transform: translateY(-8px);
      opacity: 0;
    }
  }

  @keyframes clash {
    45%,
    55% {
      transform: scale(1.06);
    }
  }

  @keyframes glint {
    0%,
    40%,
    100% {
      opacity: 0;
    }
    50% {
      opacity: 1;
    }
  }

  @keyframes swing {
    from {
      transform: rotate(-7deg);
    }
    to {
      transform: rotate(7deg);
    }
  }

  @keyframes fall {
    from {
      transform: translateY(0);
      opacity: 0.9;
    }
    to {
      transform: translateY(14px);
      opacity: 0;
    }
  }

  @keyframes bubble {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(-14px);
      opacity: 0;
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes pulse {
    from {
      transform: scale(0.8);
    }
    to {
      transform: scale(1.3);
    }
  }

  @keyframes write {
    from {
      transform: rotate(-4deg);
    }
    to {
      transform: rotate(4deg) translateX(-2px);
    }
  }

  :global([data-reduce-motion]) .anim {
    animation: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .anim {
      animation: none;
    }
  }
</style>
