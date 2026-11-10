import { mount } from "svelte";
import { audio } from "./app/audio";
import { MirroredStorage, indexedDbStore } from "./app/backupStorage";
import { GameController } from "./app/controller";
import { SLOT_KEYS } from "./game/persistence";
import App from "./ui/App.svelte";
import "./ui/theme.css";

const target = document.getElementById("app");
if (!target) throw new Error("Element #app fehlt in index.html");

const backup = indexedDbStore();
// Ein von Browser oder Nutzer gelöschtes localStorage wird aus IndexedDB wiederhergestellt.
await MirroredStorage.restore(window.localStorage, backup, SLOT_KEYS).catch((error: unknown) =>
  console.warn("Backup nicht lesbar", error),
);
const game = new GameController(new MirroredStorage(window.localStorage, backup));
mount(App, { target, props: { game } });
game.start();

// Offline-Fähigkeit nur im gebauten Spiel; im Dev-Server würde der Cache Hot Reload stören.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch((error: unknown) => console.warn("Service Worker nicht registriert", error));
}

// Diagnose-Zugang für Browser-Tests (liest nur, verändert nichts am Spielstand).
Object.assign(window, { __vhalAudio: audio });

// Browser erlauben Audio erst nach einer Nutzergeste.
const unlockAudio = (): void => audio.unlock();
window.addEventListener("pointerdown", unlockAudio);
window.addEventListener("keydown", unlockAudio);
