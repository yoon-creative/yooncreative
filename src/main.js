import { Game } from "./game.js";

const canvas = document.getElementById("game");
const game = new Game(canvas);

game.ui.showOverlay(
  "Elemental Defense",
  "Place towers to stop invaders from reaching the bottom. Pinch to zoom, drag to pan, tap a tower to upgrade.",
  "PLAY"
);

requestAnimationFrame(game.loop);