import { TOWERS, TOWER_ORDER } from "./config.js";

export class UI {
  constructor(game) {
    this.game = game;
    this.gold = document.getElementById("gold");
    this.lives = document.getElementById("lives");
    this.wave = document.getElementById("wave");
    this.btnStart = document.getElementById("btn-start");
    this.btnPause = document.getElementById("btn-pause");
    this.btnSpeed = document.getElementById("btn-speed");
    this.towerBar = document.getElementById("tower-bar");
    this.selPanel = document.getElementById("selection-panel");
    this.selName = document.getElementById("sel-name");
    this.selLevel = document.getElementById("sel-level");
    this.selDmg = document.getElementById("sel-dmg");
    this.selRng = document.getElementById("sel-rng");
    this.selRpm = document.getElementById("sel-rpm");
    this.btnUpgrade = document.getElementById("btn-upgrade");
    this.upgradeCost = document.getElementById("upgrade-cost");
    this.btnSell = document.getElementById("btn-sell");
    this.sellValue = document.getElementById("sell-value");
    this.message = document.getElementById("message");
    this.overlay = document.getElementById("overlay");
    this.overlayTitle = document.getElementById("overlay-title");
    this.overlayText = document.getElementById("overlay-text");
    this.btnOverlay = document.getElementById("btn-overlay");
    this._messageTimer = null;
    this._buildTowerBar();
    this._wire();
  }

  _buildTowerBar() {
    this.towerBar.innerHTML = "";
    this.towerButtons = {};
    for (const id of TOWER_ORDER) {
      const t = TOWERS[id];
      const btn = document.createElement("div");
      btn.className = "tower-btn"; btn.dataset.type = id;
      btn.innerHTML = `<div class="icon" style="background: radial-gradient(circle at 35% 30%, ${t.glow}, ${t.color} 60%, #000 110%);"></div><div class="name">${t.name}</div><div class="cost">${t.cost}G</div>`;
      btn.addEventListener("click", () => this.game.selectTowerType(id));
      this.towerBar.appendChild(btn);
      this.towerButtons[id] = btn;
    }
  }

  _wire() {
    this.btnStart.addEventListener("click", () => this.game.startWave());
    this.btnPause.addEventListener("click", () => { this.game.paused = !this.game.paused; this.btnPause.textContent = this.game.paused ? "▶" : "II"; });
    this.btnSpeed.addEventListener("click", () => { const speeds = [1, 2, 3]; const i = (speeds.indexOf(this.game.speed) + 1) % speeds.length; this.game.speed = speeds[i]; this.btnSpeed.textContent = this.game.speed + "x"; });
    this.btnUpgrade.addEventListener("click", () => this.game.upgradeSelected());
    this.btnSell.addEventListener("click", () => this.game.sellSelected());
    this.btnOverlay.addEventListener("click", () => { this.hideOverlay(); this.game.startNewGame(); });
  }

  update() {
    const g = this.game;
    this.gold.textContent = g.gold; this.lives.textContent = g.lives; this.wave.textContent = g.wave;
    for (const id of TOWER_ORDER) {
      const btn = this.towerButtons[id];
      btn.classList.toggle("selected", g.placingType === id);
      btn.classList.toggle("disabled", g.gold < TOWERS[id].cost);
    }
    if (g.waveActive) { this.btnStart.classList.remove("ready"); this.btnStart.classList.add("in-wave"); this.btnStart.textContent = "WAVE " + g.wave; }
    else { this.btnStart.classList.add("ready"); this.btnStart.classList.remove("in-wave"); this.btnStart.textContent = g.wave === 0 ? "START" : "NEXT WAVE"; }
    if (g.selectedTower) {
      const tower = g.selectedTower, s = tower.stats();
      this.selPanel.classList.remove("hidden");
      this.selName.textContent = tower.type.name; this.selLevel.textContent = tower.level;
      this.selDmg.textContent = s.dmg; this.selRng.textContent = s.range.toFixed(1); this.selRpm.textContent = (s.fireRate * 60).toFixed(0);
      const uc = tower.upgradeCost();
      if (uc === null) { this.btnUpgrade.classList.add("disabled"); this.upgradeCost.textContent = "MAX"; }
      else { this.btnUpgrade.classList.toggle("disabled", g.gold < uc); this.upgradeCost.textContent = uc; }
      this.sellValue.textContent = tower.sellValue();
    } else { this.selPanel.classList.add("hidden"); }
  }

  showMessage(text, kind = "") {
    this.message.textContent = text; this.message.className = "show " + kind;
    if (this._messageTimer) clearTimeout(this._messageTimer);
    this._messageTimer = setTimeout(() => { this.message.className = "hidden"; }, 1500);
  }
  showOverlay(title, text, button = "PLAY") { this.overlayTitle.textContent = title; this.overlayText.textContent = text; this.btnOverlay.textContent = button; this.overlay.classList.remove("hidden"); }
  hideOverlay() { this.overlay.classList.add("hidden"); }
}