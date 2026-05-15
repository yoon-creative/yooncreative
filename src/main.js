import { Game } from "./game.js";

const canvas = document.getElementById("game");
const game = new Game(canvas);

// Show start overlay; game starts when player taps PLAY
game.ui.showOverlay(
  "Elemental Defense",
  "Place towers to stop invaders from reaching the bottom. Pinch to zoom, drag to pan, tap a tower to upgrade.",
  "PLAY"
);

requestAnimationFrame(game.loop);
window.__game = game; // for debugging
