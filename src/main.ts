import { mount } from "svelte";
import { GameController } from "./app/controller";
import App from "./ui/App.svelte";
import "./ui/theme.css";

const target = document.getElementById("app");
if (!target) throw new Error("Element #app fehlt in index.html");

const game = new GameController(window.localStorage);
mount(App, { target, props: { game } });
game.start();
