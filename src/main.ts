import { mount } from "svelte";
import { audio } from "./app/audio";
import { GameController } from "./app/controller";
import App from "./ui/App.svelte";
import "./ui/theme.css";

const target = document.getElementById("app");
if (!target) throw new Error("Element #app fehlt in index.html");

const game = new GameController(window.localStorage);
mount(App, { target, props: { game } });
game.start();

// Browser erlauben Audio erst nach einer Nutzergeste.
const unlockAudio = (): void => audio.unlock();
window.addEventListener("pointerdown", unlockAudio);
window.addEventListener("keydown", unlockAudio);
