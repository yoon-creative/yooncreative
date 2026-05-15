import { GRID, TOWERS, ECONOMY } from "./config.js";
import { Grid } from "./grid.js";
import { Camera } from "./camera.js";
import { InputManager } from "./input.js";
import { Tower } from "./tower.js";
import { buildWave, WaveRunner } from "./wave.js";
import { UI } from "./ui.js";

export class Game {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.grid = new Grid(); this.camera = new Camera(this.grid);
    this.gold = ECONOMY.startingGold; this.lives = ECONOMY.startingLives; this.wave = 0;
    this.enemies = []; this.projectiles = []; this.effects = [];
    this.placingType = null; this.selectedTower = null;
    this.waveActive = false; this.waveRunner = null;
    this.gameOver = false; this.paused = false; this.speed = 1;
    this.ui = new UI(this);
    this.input = new InputManager(canvas, this.camera, (wx, wy, sx, sy) => this._handleTap(wx, wy, sx, sy));
    this._lastTime = performance.now();
    this._resize();
    window.addEventListener("resize", () => this._resize());
    window.addEventListener("orientationchange", () => setTimeout(() => this._resize(), 100));
  }

  startNewGame() {
    this.gold = ECONOMY.startingGold; this.lives = ECONOMY.startingLives; this.wave = 0;
    this.enemies.length = 0; this.projectiles.length = 0; this.effects.length = 0;
    this.grid.cells.fill(null); this.grid.invalidatePath();
    this.placingType = null; this.selectedTower = null;
    this.waveActive = false; this.waveRunner = null; this.gameOver = false;
    this.ui.hideOverlay(); this.ui.showMessage("Build your first defense!", "good");
  }

  _resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.canvas.style.width = window.innerWidth + "px";
    this.canvas.style.height = window.innerHeight + "px";
    this.camera.resize(this.canvas.width, this.canvas.height);
  }

  selectTowerType(typeId) { this.placingType = this.placingType === typeId ? null : typeId; if (this.placingType) this.selectedTower = null; }

  _handleTap(wx, wy) {
    const cell = this.grid.worldToCell(wx, wy);
    if (!this.grid.inBounds(cell.col, cell.row)) { this.placingType = null; this.selectedTower = null; return; }
    const existing = this.grid.getTower(cell.col, cell.row);
    if (existing) { this.selectedTower = existing; this.placingType = null; return; }
    if (this.placingType) {
      const type = TOWERS[this.placingType];
      if (this.gold < type.cost) { this.ui.showMessage("Not enough gold", "warn"); return; }
      if (this.grid.isReserved(cell.col, cell.row)) { this.ui.showMessage("Path tile — can't build here", "warn"); return; }
      if (!this.grid.canPlace(cell.col, cell.row)) { this.ui.showMessage("Would block path", "warn"); return; }
      const tower = new Tower(this.placingType, cell.col, cell.row);
      this.grid.placeTower(cell.col, cell.row, tower);
      this.gold -= type.cost;
      this._updateEnemyPaths();
    } else { this.selectedTower = null; }
  }

  upgradeSelected() {
    const t = this.selectedTower; if (!t) return;
    const cost = t.upgradeCost();
    if (cost === null) { this.ui.showMessage("Already max level", "warn"); return; }
    if (this.gold < cost) { this.ui.showMessage("Not enough gold", "warn"); return; }
    this.gold -= cost; t.upgrade();
    this.ui.showMessage(`${t.type.name} → Lv ${t.level}`, "good");
  }

  sellSelected() {
    const t = this.selectedTower; if (!t) return;
    this.gold += t.sellValue(); this.grid.removeTower(t.col, t.row);
    this.selectedTower = null; this._updateEnemyPaths();
  }

  startWave() {
    if (this.waveActive || this.gameOver) return;
    this.wave++; this.waveRunner = new WaveRunner(buildWave(this.wave));
    this.waveActive = true; this.ui.showMessage("Wave " + this.wave, "good");
    this._updateEnemyPaths();
  }

  _updateEnemyPaths() { const path = this.grid.computePath(); if (path) for (const e of this.enemies) if (!e.dead && !e.escaped) e.setPath(path); }

  _onWaveEnd() {
    this.waveActive = false; this.waveRunner = null;
    const bonus = ECONOMY.waveCompleteBonus + this.wave * ECONOMY.waveCompleteScale;
    this.gold += bonus; this.ui.showMessage(`Wave clear! +${bonus}G`, "good");
  }

  loop = () => {
    requestAnimationFrame(this.loop);
    const now = performance.now();
    let dt = Math.min((now - this._lastTime) / 1000, 0.05);
    this._lastTime = now;
    this.update(this.paused ? 0 : dt * this.speed);
    this.render(); this.ui.update();
  };

  update(dt) {
    if (dt === 0 || this.gameOver) return;
    this.camera.applyInertia(dt);
    if (this.waveActive && this.waveRunner) {
      const path = this.grid.computePath();
      this.waveRunner.update(dt, (e) => { if (path) e.setPath(path); this.enemies.push(e); });
    }
    for (const e of this.enemies) {
      e.update(dt);
      if (e.escaped && !e._counted) {
        this.lives -= e.livesCost; e._counted = true;
        if (this.lives <= 0) { this.lives = 0; this.gameOver = true; this.ui.showOverlay("Defeat", `You held out until wave ${this.wave}.`, "TRY AGAIN"); }
      }
    }
    this.grid.forEachTower((t) => t.update(dt, this.enemies, this.projectiles));
    for (const p of this.projectiles) p.update(dt, this.enemies, this.effects);
    for (const e of this.enemies) { if (e.dead && !e._rewarded) { e._rewarded = true; this.gold += e.reward; } }
    this.enemies = this.enemies.filter(e => !(e.dead && e._rewarded) && !(e.escaped && e._counted));
    this.projectiles = this.projectiles.filter(p => !p.dead);
    for (const fx of this.effects) fx.t -= dt;
    this.effects = this.effects.filter(fx => fx.t > 0);
    if (this.waveActive && this.waveRunner?.done && this.enemies.length === 0) this._onWaveEnd();
  }

  render() {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#0d1228"); grad.addColorStop(1, "#060814");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2); ctx.scale(this.camera.zoom, this.camera.zoom); ctx.translate(-this.camera.x, -this.camera.y);
    this._renderGrid(ctx); this._renderPath(ctx); this._renderSpawnExit(ctx);
    this._renderTowers(ctx); this._renderRangePreview(ctx);
    this._renderEnemies(ctx); this._renderProjectiles(ctx); this._renderEffects(ctx);
    ctx.restore();
  }

  _renderGrid(ctx) {
    const tile = GRID.tileSize, ww = this.grid.worldWidth(), wh = this.grid.worldHeight();
    ctx.fillStyle = "#13182e"; ctx.fillRect(0, 0, ww, wh);
    ctx.fillStyle = "rgba(110,200,255,0.04)"; ctx.fillRect(GRID.spawnCol * tile, 0, tile, wh);
    if (this.camera.zoom > 0.6) {
      ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1 / this.camera.zoom; ctx.beginPath();
      for (let c = 0; c <= this.grid.cols; c++) { ctx.moveTo(c * tile, 0); ctx.lineTo(c * tile, wh); }
      for (let r = 0; r <= this.grid.rows; r++) { ctx.moveTo(0, r * tile); ctx.lineTo(ww, r * tile); }
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(138,124,255,0.4)"; ctx.lineWidth = 2 / this.camera.zoom; ctx.strokeRect(0, 0, ww, wh);
  }

  _renderSpawnExit(ctx) {
    const tile = GRID.tileSize;
    const drawArrow = (cx, cy, dir, color) => {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(dir); ctx.fillStyle = color; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.moveTo(0, -tile * 0.35); ctx.lineTo(tile * 0.3, tile * 0.2); ctx.lineTo(0, tile * 0.05); ctx.lineTo(-tile * 0.3, tile * 0.2); ctx.closePath(); ctx.fill(); ctx.restore();
    };
    const sc = this.grid.cellCenterWorld(GRID.spawnCol, 0), ec = this.grid.cellCenterWorld(GRID.exitCol, GRID.rows - 1);
    ctx.fillStyle = "rgba(110,200,255,0.18)"; ctx.fillRect(sc.x - tile/2, sc.y - tile/2, tile, tile); drawArrow(sc.x, sc.y, Math.PI, "#6ec8ff");
    ctx.fillStyle = "rgba(255,107,107,0.18)"; ctx.fillRect(ec.x - tile/2, ec.y - tile/2, tile, tile); drawArrow(ec.x, ec.y, 0, "#ff6b6b");
  }

  _renderPath(ctx) {
    const path = this.grid.computePath(); if (!path || path.length < 2) return;
    const tile = GRID.tileSize;
    ctx.save(); ctx.strokeStyle = "rgba(255,204,85,0.18)"; ctx.lineWidth = tile * 0.55; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    for (let i = 0; i < path.length; i++) { const p = path[i], x = p.col * tile + tile/2, y = p.row * tile + tile/2; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke(); ctx.restore();
  }

  _renderTowers(ctx) {
    const tile = GRID.tileSize;
    this.grid.forEachTower((t) => {
      const c = t.centerWorld(), lvl = t.level;
      ctx.save(); ctx.translate(c.x, c.y);
      ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(0, tile*0.18, tile*0.42, tile*0.16, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#1a2244"; ctx.strokeStyle = t.type.color; ctx.lineWidth = 1.5;
      const base = tile * (0.34 + lvl * 0.02);
      this._roundRect(ctx, -base, -base, base*2, base*2, tile*0.12); ctx.fill(); ctx.stroke();
      const ringR = tile * (0.18 + lvl * 0.03);
      const grad = ctx.createRadialGradient(0,0,0,0,0,ringR*1.6);
      grad.addColorStop(0, t.type.glow); grad.addColorStop(0.5, t.type.color); grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, ringR*1.4, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = t.type.glow; ctx.globalAlpha = 0.6;
      for (let i = 0; i < lvl; i++) { ctx.beginPath(); ctx.arc(0, 0, ringR + i*2 + 4, 0, Math.PI*2); ctx.lineWidth = 1.2; ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.rotate(t.angle);
      const barrelLen = tile * (0.34 + lvl * 0.05), barrelW = tile * (0.1 + lvl * 0.015);
      ctx.fillStyle = "#2a3358"; ctx.fillRect(0, -barrelW/2, barrelLen, barrelW);
      ctx.fillStyle = t.type.color; ctx.fillRect(barrelLen - barrelW, -barrelW/2 - 1, barrelW, barrelW + 2);
      if (t.firePulse > 0) { ctx.fillStyle = `rgba(255,230,160,${t.firePulse/0.12})`; ctx.beginPath(); ctx.arc(barrelLen, 0, tile*0.22, 0, Math.PI*2); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = t.type.glow;
      for (let i = 0; i < lvl; i++) { ctx.beginPath(); ctx.arc(c.x - (lvl-1)*3 + i*6, c.y + tile*0.42, 1.6, 0, Math.PI*2); ctx.fill(); }
    });
  }

  _renderRangePreview(ctx) {
    if (!this.selectedTower) return;
    const t = this.selectedTower, c = t.centerWorld(), r = t.rangeWorld();
    ctx.fillStyle = "rgba(138,124,255,0.10)"; ctx.strokeStyle = "rgba(138,124,255,0.55)"; ctx.lineWidth = 1.5 / this.camera.zoom;
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  }

  _renderEnemies(ctx) {
    for (const e of this.enemies) {
      if (e.dead || e.escaped) continue;
      ctx.save(); ctx.translate(e.x, e.y);
      ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.ellipse(0, e.radius*0.6, e.radius*0.9, e.radius*0.35, 0, 0, Math.PI*2); ctx.fill();
      const grad = ctx.createRadialGradient(-e.radius*0.3, -e.radius*0.3, e.radius*0.1, 0, 0, e.radius);
      grad.addColorStop(0, "#ffffff"); grad.addColorStop(0.25, e.color); grad.addColorStop(1, shadeColor(e.color, -0.4));
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI*2); ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = e.flash > 0 ? "#ffffff" : shadeColor(e.color, -0.5); ctx.stroke();
      if (e.slow > 0) { ctx.strokeStyle = "rgba(123,200,255,0.9)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, e.radius+3, 0, Math.PI*2); ctx.stroke(); }
      if (e.stunTimer > 0) { ctx.fillStyle = "#ffd24a"; ctx.beginPath(); ctx.arc(0, -e.radius-6, 2.5, 0, Math.PI*2); ctx.fill(); }
      ctx.restore();
      const bw = Math.max(14, e.radius*2.4), hpFrac = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(e.x - bw/2 - 1, e.y - e.radius - 9, bw+2, 4);
      ctx.fillStyle = hpFrac > 0.5 ? "#6fe28a" : (hpFrac > 0.25 ? "#ffcc55" : "#ff5577");
      ctx.fillRect(e.x - bw/2, e.y - e.radius - 8, bw * hpFrac, 2);
    }
  }

  _renderProjectiles(ctx) {
    for (const p of this.projectiles) {
      if (p.dead) continue;
      for (let i = 0; i < p.trail.length; i++) { const t = p.trail[i]; const a = Math.max(0, t.t/0.18); ctx.fillStyle = `rgba(255,255,255,${a*0.4})`; ctx.beginPath(); ctx.arc(t.x, t.y, 1.5 + i*0.3, 0, Math.PI*2); ctx.fill(); }
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, Math.PI*2); ctx.fill();
    }
  }

  _renderEffects(ctx) {
    for (const fx of this.effects) {
      const a = Math.max(0, fx.t / fx.max);
      if (fx.type === "hit") { ctx.strokeStyle = fx.color; ctx.globalAlpha = a; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r*(1.4-a), 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha = 1; }
      else if (fx.type === "splash") { const grad = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, fx.r); grad.addColorStop(0, `rgba(255,180,80,${0.55*a})`); grad.addColorStop(1, "rgba(255,180,80,0)"); ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r*(1.2-a*0.5), 0, Math.PI*2); ctx.fill(); }
      else if (fx.type === "chain") {
        ctx.strokeStyle = fx.color; ctx.globalAlpha = a; ctx.lineWidth = 2; ctx.beginPath();
        const segs = 6, dx = (fx.x2-fx.x1)/segs, dy = (fx.y2-fx.y1)/segs;
        ctx.moveTo(fx.x1, fx.y1);
        for (let i = 1; i < segs; i++) ctx.lineTo(fx.x1+dx*i+(Math.random()-0.5)*6, fx.y1+dy*i+(Math.random()-0.5)*6);
        ctx.lineTo(fx.x2, fx.y2); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x+r, y); ctx.arcTo(x+w, y, x+w, y+h, r); ctx.arcTo(x+w, y+h, x, y+h, r); ctx.arcTo(x, y+h, x, y, r); ctx.arcTo(x, y, x+w, y, r); ctx.closePath();
  }
}

function shadeColor(hex, lum) {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map(x => x+x).join("");
  const r = Math.max(0, Math.min(255, parseInt(c.substr(0,2),16) + Math.round(255*lum)));
  const g = Math.max(0, Math.min(255, parseInt(c.substr(2,2),16) + Math.round(255*lum)));
  const b = Math.max(0, Math.min(255, parseInt(c.substr(4,2),16) + Math.round(255*lum)));
  return "#" + [r,g,b].map(v => v.toString(16).padStart(2,"0")).join("");
}