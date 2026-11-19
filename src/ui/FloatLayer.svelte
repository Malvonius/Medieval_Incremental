<script lang="ts">
  import { flashes, floaters } from "./fx";

  let flashing = $state(false);
  let first = true;
  $effect(() => {
    void $flashes;
    if (first) {
      first = false;
      return;
    }
    flashing = true;
    const handle = setTimeout(() => (flashing = false), 700);
    return () => clearTimeout(handle);
  });
</script>

<div class="layer" aria-hidden="true">
  {#each $floaters as f (f.id)}
    <span class="float {f.kind}" style:left="{f.x}px" style:top="{f.y}px">
      {f.text}
      {#each { length: f.coins }, i (i)}
        <span class="coin" style:--dx="{(i - (f.coins - 1) / 2) * 18}px" style:--delay="{i * 40}ms"></span>
      {/each}
    </span>
  {/each}
  {#if flashing}<div class="flash"></div>{/if}
</div>

<style>
  .layer {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 35;
    overflow: hidden;
  }

  .float {
    position: absolute;
    transform: translate(-50%, 0);
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--gold);
    text-shadow: 0 1px 0 #000, 0 0 10px rgb(212 165 74 / 0.6);
    white-space: nowrap;
    animation: rise 1.1s ease-out forwards;
  }

  .float.buy {
    color: var(--text);
    font-size: 0.95rem;
  }

  .float.gift {
    color: #ffe08a;
    font-size: 1.3rem;
  }

  .coin {
    position: absolute;
    left: 50%;
    top: 60%;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #ffe7a3, #c8902c 60%, #7a5418);
    box-shadow: 0 0 4px rgb(255 200 90 / 0.6);
    animation: coin 0.9s ease-out var(--delay) forwards;
    opacity: 0;
  }

  .flash {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 40%, rgb(255 225 150 / 0.45), transparent 60%);
    animation: flash 0.7s ease-out forwards;
  }

  @keyframes rise {
    from {
      opacity: 1;
      transform: translate(-50%, 0) scale(1);
    }
    to {
      opacity: 0;
      transform: translate(-50%, -60px) scale(1.15);
    }
  }

  @keyframes coin {
    0% {
      opacity: 1;
      transform: translate(-50%, 0);
    }
    50% {
      opacity: 1;
      transform: translate(calc(-50% + var(--dx)), -40px);
    }
    100% {
      opacity: 0;
      transform: translate(calc(-50% + var(--dx) * 1.4), 10px);
    }
  }

  @keyframes flash {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

  :global([data-reduce-motion]) .float,
  :global([data-reduce-motion]) .coin,
  :global([data-reduce-motion]) .flash {
    display: none;
  }
</style>
