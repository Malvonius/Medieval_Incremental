<script lang="ts">
  import type { BuyAmount } from "../../game/actions";

  let { value = $bindable() }: { value: BuyAmount } = $props();
  const OPTIONS: readonly { value: BuyAmount; label: string }[] = [
    { value: 1, label: "×1" },
    { value: 10, label: "×10" },
    { value: "max", label: "Max" },
  ];
</script>

<div class="toggle" role="radiogroup" aria-label="Kaufmenge">
  {#each OPTIONS as option (option.value)}
    <button
      role="radio"
      aria-checked={value === option.value}
      class:on={value === option.value}
      onclick={() => (value = option.value)}>{option.label}</button
    >
  {/each}
</div>

<style>
  .toggle {
    display: inline-flex;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    overflow: hidden;
  }

  button {
    background: var(--bg-sunken);
    border: none;
    padding: 3px 10px;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  button + button {
    border-left: 1px solid var(--border-strong);
  }

  button.on {
    background: var(--surface-hover);
    color: var(--gold);
  }
</style>
