# Die Asche von Vhal

Ein Dark-Medieval Incremental Game für den Browser. Spielzeit: ca. 8 Stunden, aufgeteilt in fünf Akte
mit zwei Enden. Vollständig spielbar – von der Ruine bis zur letzten Glocke.

**Spielen:** https://malvonius.github.io/Medieval_Incremental/

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
- Svelte-Komponenten erhalten pro Frame einen neuen `Snapshot`, `snap.state` ist aber dieselbe, intern veränderte Instanz: nie `$derived(snap.state.objekt)` bilden, sondern Werte direkt lesen oder flach kopieren.
- Spielstände sind versioniert, komprimiert (lz-string) und mit FNV-1a geprüft. Ein beschädigter Spielstand wird nie überschrieben, sondern unter `vhal.save.corrupt` gesichert.

### Neue Inhalte hinzufügen

| Was | Wo |
|---|---|
| Gebäude / Upgrade / Rezept / Expedition / Forschung / Gelübde / Welle | `src/content/balance.ts` |
| Story-Knoten | `src/content/story.ts` (Trigger = reine Funktion über den Spielstand) |
| Neue Kachel | Panel unter `src/ui/tiles/`, Eintrag in `src/ui/tiles/registry.ts`, Freischaltung per Story-Effekt `unlockTile` |
| Schemaänderung am Spielstand | `SAVE_VERSION` in `src/game/state.ts` erhöhen und Migration in `src/game/migrations.ts` anhängen |

### Balancing

Nach jeder Änderung an `balance.ts` oder Story-Triggern `npm run sim` ausführen
(`npm run sim -- --until=a1_grey_banner` stoppt früher). Der Bot spielt etwa 28 % schneller als ein Mensch.
Der Test `src/sim/bot.test.ts` schlägt fehl, wenn der Bot Akt I nicht in 32–54 min, Akt II nicht
in 88–128 min, Akt III nicht in 158–232 min, Akt IV nicht in 228–336 min oder das Spiel nicht in 292–400 min
(jeweils Gesamtzeit) abschließt. Ein Bot-Ende bei ≈ 361 min entspricht ≈ 8 h für Menschen.

## Roadmap

| Akt | Inhalt | Kacheln |
|---|---|---|
| I – Die Ruine ✅ | Burg aufbauen, Schmiede, der Graue Orden erscheint | Burgfried, Schmiede, Chronik |
| II – Der Graue Orden ✅ | Soldaten, Expeditionen, Verhöre & Fronarbeit, Sturm auf die Komturei | Kriegsrat, Kerker |
| III – Was unter der Erde liegt ✅ | Seelen als zweite Währung, Pakte, Forschungsbaum, Stein der Weisen | Krypta, Alchemistenturm |
| IV – Glaube und Verrat ✅ | Glaube, Gelübde (Segen + Fluch), Verrat, Ritual der Asche (Prestige) | Kapelle, Ritual der Asche |
| V – Die letzte Glocke ✅ | Belagerung in 8 Wellen, Befestigungen, Wehrkraft, zwei Enden | (im Kriegsrat) |

## Deployment

Jeder Push auf `main` baut das Spiel und veröffentlicht es über `.github/workflows/deploy.yml` auf
GitHub Pages (vorher laufen die Tests). Einmalig nötig: unter **Settings → Pages → Build and deployment**
als Quelle **GitHub Actions** wählen. Für private Repositories setzt GitHub Pages einen kostenpflichtigen
Plan voraus, sonst muss das Repository öffentlich sein. Manuell auslösen: **Actions → Deploy auf GitHub
Pages → Run workflow**.

Vite baut mit relativen Pfaden (`base: "./"`), daher läuft das Spiel unter jedem Unterpfad.
