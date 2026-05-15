import { ENEMIES, GRID } from "./config.js";

export class Enemy {
  constructor(typeId, hp, speed, reward, lives) {
    const t = ENEMIES[typeId];
    this.typeId = typeId;
    this.color = t.color;
    this.radius = t.radius * GRID.tileSize;
    this.maxHp = hp;
    this.hp = hp;
    this.speed = speed;       // tiles per second
    this.reward = reward;
    this.livesCost = lives;

    // Spawn at top entry tile
    const spawn = { col: GRID.spawnCol, row: 0 };
    this.x = spawn.col * GRID.tileSize + GRID.tileSize / 2;
    this.y = spawn.row * GRID.tileSize + GRID.tileSize / 2;
    this.vx = 0; this.vy = 0;

    this.path = null;
    this.pathIndex = 1; // 0 is current cell
    this.dead = false;
    this.escaped = false;

    this.slow = 0;        // 0..1 fraction (0.6 = move at 40%)
    this.slowTimer = 0;
    this.stunTimer = 0;

    this.progress = 0;    // approximate distance traveled (used by tower targeting)
    this.flash = 0;
  }

  setPath(path) {
    if (!path || path.length === 0) return;
    // Try exact cell match first; fall back to nearest cell on the path.
    const cellCol = Math.floor(this.x / GRID.tileSize);
    const cellRow = Math.floor(this.y / GRID.tileSize);
    let idx = -1;
    for (let i = 0; i < path.length; i++) {
      if (path[i].col === cellCol && path[i].row === cellRow) { idx = i; break; }
    }
    if (idx === -1) {
      // Closest by world distance, but only forward of the start.
      let bestI = 0, bestD = Infinity;
      for (let i = 0; i < path.length; i++) {
        const px = path[i].col * GRID.tileSize + GRID.tileSize / 2;
        const py = path[i].row * GRID.tileSize + GRID.tileSize / 2;
        const d = (px - this.x) ** 2 + (py - this.y) ** 2;
        if (d < bestD) { bestD = d; bestI = i; }
      }
      idx = bestI;
    }
    this.path = path;
    this.pathIndex = Math.min(path.length - 1, idx + 1);
  }

  takeDamage(dmg) {
    if (this.dead) return;
    this.hp -= dmg;
    this.flash = 0.12;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
  }

  applySlow(amount, duration) {
    if (amount > this.slow) this.slow = amount;
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  applyStun(duration) {
    this.stunTimer = Math.max(this.stunTimer, duration);
  }

  update(dt) {
    if (this.dead || this.escaped) return;
    if (this.flash > 0) this.flash -= dt;

    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.vx = 0; this.vy = 0;
      return;
    }

    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slow = 0;
    }

    if (!this.path || this.pathIndex >= this.path.length) {
      this.escaped = true;
      return;
    }

    const target = this.path[this.pathIndex];
    const tx = target.col * GRID.tileSize + GRID.tileSize / 2;
    const ty = target.row * GRID.tileSize + GRID.tileSize / 2;
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    const speedFactor = 1 - this.slow;
    const v = this.speed * GRID.tileSize * speedFactor;
    const step = v * dt;

    if (step >= d) {
      this.x = tx; this.y = ty;
      this.progress += d;
      this.pathIndex++;
      if (this.pathIndex >= this.path.length) {
        // Check if reached the exit cell
        const last = this.path[this.path.length - 1];
        const exit = { col: GRID.exitCol, row: GRID.rows - 1 };
        if (last.col === exit.col && last.row === exit.row) {
          this.escaped = true;
        }
      }
      this.vx = 0; this.vy = 0;
    } else {
      const nx = dx / d, ny = dy / d;
      this.x += nx * step;
      this.y += ny * step;
      this.progress += step;
      this.vx = nx * v;
      this.vy = ny * v;
    }
  }
}
