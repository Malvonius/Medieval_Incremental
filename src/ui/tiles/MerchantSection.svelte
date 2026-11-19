<script lang="ts">
  import { t, tx } from "../../i18n";
  import { bi } from "../../i18n/bi";
  import type { GameController, Snapshot } from "../../app/controller";
  import { OFFERS } from "../../content/living";
  import type { OfferMood } from "../../game/state";
  import { formatDuration, formatNumber } from "../format";
  import { floatAt } from "../fx";

  let { game, snap }: { game: GameController; snap: Snapshot } = $props();

  // Flache Kopie: der Spielstand wird intern verändert; ein $derived auf dasselbe Objekt löste nie neu aus.
  const m = $derived({ ...snap.state.merchant, offers: snap.state.merchant.offers.map((o) => ({ ...o })) });
  const MOOD_TEXT: Readonly<Record<OfferMood, string>> = {
    new: "",
    deal: "„Na gut, weil Ihr es seid.“ (−30 %)",
    firm: "„Mein letztes Wort.“",
    offended: "„Beleidigung! Das verkaufe ich Euch nie.“",
    sold: "Verkauft.",
  };

  function buy(event: MouseEvent, index: number): void {
    const target = event.currentTarget as Element;
    if (game.dispatch({ type: "buyOffer", index }).ok) floatAt(target, $tx("Handel!"), "buy");
  }
</script>

{#if snap.state.tiles.keep}
  <section class="panel-section merchant" class:present={m.present}>
    <h3 class="section-title">{$tx("Der wandernde Händler")}</h3>
    {#if m.present}
      <p class="hint">{$tx("Ein Karren voller Kisten steht am Tor. Der Händler zieht in {time} weiter. Feilschen kann sich lohnen – oder ihn beleidigen.", { time: formatDuration(m.timer) })}</p>
      <ul class="offers">
        {#each m.offers as offer, i (i)}
          {@const def = OFFERS[offer.kind]}
          {@const closed = offer.mood === "sold" || offer.mood === "offended"}
          <li class="offer {offer.mood}">
            <div class="what">
              <span class="name">{$bi(def.name)}</span>
              {#if def.resource && offer.amount.gt(0)}<span class="amount num">+{formatNumber(offer.amount)} {$t(`res.${def.resource}`)}</span>{/if}
              {#if offer.kind === "soldiers"}<span class="amount num">+{formatNumber(offer.amount)} {$t("res.soldiers")}</span>{/if}
              {#if MOOD_TEXT[offer.mood]}<span class="mood">{$tx(MOOD_TEXT[offer.mood])}</span>{/if}
            </div>
            <div class="buttons">
              <button class="btn" disabled={closed || snap.state.resources.gold.lt(offer.price)} onclick={(e) => buy(e, i)}>
                {$tx("Kaufen")} <span class="num">{formatNumber(offer.price)}</span> {$tx("Gold")}
              </button>
              <button class="btn" disabled={offer.mood !== "new"} onclick={() => game.dispatch({ type: "haggle", index: i })}>{$tx("Feilschen")}</button>
            </div>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="hint">{$tx("Der Händler ist unterwegs. Er kommt in etwa {time} wieder.", { time: formatDuration(m.timer) })}</p>
    {/if}
  </section>
{/if}

<style>
  .hint {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin: 0 0 8px;
  }

  .merchant.present {
    border-left: 2px solid var(--gold);
    padding-left: 10px;
  }

  .offers {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }

  .offer {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-sunken);
  }

  .offer.deal {
    border-color: var(--moss);
  }

  .offer.offended,
  .offer.sold {
    opacity: 0.6;
  }

  .what {
    display: grid;
  }

  .name {
    font-family: var(--font-display);
  }

  .amount {
    color: var(--gold);
    font-size: 0.85rem;
  }

  .mood {
    font-style: italic;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .buttons {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
</style>
