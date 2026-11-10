# Die Asche von Vhal

Ein Dark-Medieval Incremental Game für den Browser. Ziel-Spielzeit: ca. 8 Stunden, aufgeteilt in fünf Akte.
Aktuell spielbar: **Akt I – Die Ruine** (ca. 60 min).

## Entwicklung

Voraussetzung: Node.js 22 oder neuer.

```bash
npm install
npm run dev        # Dev-Server mit Hot Reload
npm run verify     # Typecheck, Lint, Tests, Build – vor jedem Commit
npm run sim        # Balancing-Bot: Zeit pro Story-Knoten vs. Soll (--csv für Export)
```

## Architektur

```
src/
├─ core/      Engine, spielunabhängig: Decimal, Kostenformeln, Fixed-Timestep-Loop, Event-Bus, Speicherformat
├─ content/   Reine Daten: IDs, Balancing-Werte (balance.ts), Story-Graph (story.ts)
├─ game/      Spiellogik: State, Aktionen, Raten, Schmiede, Story-Director, Simulation, Offline, Persistenz
├─ sim/       Greedy-Bot für Pacing-Messung (läuft auch als Test)
├─ app/       Controller: verbindet Simulation, Loop, Autosave und Svelte-Stores
└─ ui/        Svelte-Komponenten; tiles/registry.ts definiert das Kachel-Menü
```

**Grundregeln**

- `core/` und `game/` haben keine DOM-Abhängigkeit und sind deterministisch. Bot und Tests nutzen exakt denselben Code wie das Spiel.
- Die Simulation verändert ihren State intern direkt (schnell, keine Allokation pro Tick). Die UI sieht nur `DeepReadonly`-Snapshots und ändert den Spielstand ausschließlich über `dispatch(action)`.
- Aktionen liefern `Result` (`{ ok }` bzw. `{ ok: false, reason }`), statt still zu scheitern.
- Spielstände sind versioniert, komprimiert (lz-string) und mit FNV-1a geprüft. Ein beschädigter Spielstand wird nie überschrieben, sondern unter `vhal.save.corrupt` gesichert.

### Neue Inhalte hinzufügen

| Was | Wo |
|---|---|
| Gebäude / Upgrade / Rezept | `src/content/balance.ts` |
| Story-Knoten | `src/content/story.ts` (Trigger = reine Funktion über den Spielstand) |
| Neue Kachel | Panel unter `src/ui/tiles/`, Eintrag in `src/ui/tiles/registry.ts`, Freischaltung per Story-Effekt `unlockTile` |
| Schemaänderung am Spielstand | `SAVE_VERSION` in `src/game/state.ts` erhöhen und Migration in `src/game/migrations.ts` anhängen |

### Balancing

Nach jeder Änderung an `balance.ts` oder Story-Triggern `npm run sim` ausführen. Der Bot spielt etwa
28 % schneller als ein Mensch. Der Test `src/sim/bot.test.ts` schlägt fehl, wenn Akt I für den Bot
außerhalb von 32–54 Minuten liegt.

## Roadmap

| Akt | Inhalt | Kacheln |
|---|---|---|
| I – Die Ruine ✅ | Burg aufbauen, Schmiede, der Graue Orden erscheint | Burgfried, Schmiede, Chronik |
| II – Der Graue Orden | Expeditionen, Gefangene | Kriegsrat, Kerker |
| III – Was unter der Erde liegt | Seelen als zweite Währung, Forschung | Krypta, Alchemistenturm |
| IV – Glaube und Verrat | Segen/Flüche, erstes Prestige | Kapelle, Ritual der Asche |
| V – Die letzte Glocke | Belagerung, zwei Enden | – |
