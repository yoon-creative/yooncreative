import { TOWERS, UPGRADE, GRID } from "./config.js";
import { Projectile } from "./projectile.js";

export class Tower {
  constructor(typeId, col, row) {
    this.type = TOWERS[typeId];
    this.typeId = typeId;
    this.col = col;
    this.row = row;
    this.level = 1;
    this.cooldown = 0;
    this.angle = 0;
    this.totalSpent = this.type.cost;
    this.firePulse = 0;
  }

  stats() { return this.type.levels[this.level - 1]; }

  upgradeCost() {
    if (this.level >= 5) return null;
    const mult = UPGRADE.multipliers[this.level - 1];
    return Math.round(this.type.cost * mult);
  }

  sellValue() {
    return Math.floor(this.totalSpent * UPGRADE.sellRefund);
  }

  upgrade() {
    if (this.level >= 5) return false;
    this.totalSpent += this.upgradeCost();
    this.level++;
    return true;
  }

  centerWorld() {
    return {
      x: this.col * GRID.tileSize + GRID.tileSize / 2,
      y: this.row * GRID.tileSize + GRID.tileSize / 2,
    };
  }

  rangeWorld() { return this.stats().range * GRID.tileSize; }

  // Find nearest enemy in range. Returns enemy or null.
  pickTarget(enemies) {
    const c = this.centerWorld();
    const r = this.rangeWorld();
    let best = null;
    let bestProgress = -Infinity;
    for (const e of enemies) {
      if (e.dead || e.escaped) continue;
      const dx = e.x - c.x, dy = e.y - c.y;
      if (dx * dx + dy * dy > r * r) continue;
      // Prefer enemies closest to the exit (highest progress).
      if (e.progress > bestProgress) {
        best = e; bestProgress = e.progress;
      }
    }
    return best;
  }

  update(dt, enemies, projectiles) {
    this.cooldown -= dt;
    if (this.firePulse > 0) this.firePulse -= dt;
    if (this.cooldown > 0) return;

    const target = this.pickTarget(enemies);
    if (!target) return;

    const c = this.centerWorld();
    const dx = target.x - c.x, dy = target.y - c.y;
    this.angle = Math.atan2(dy, dx);

    const s = this.stats();
    this.cooldown = 1 / s.fireRate;
    this.firePulse = 0.12;

    // Lead target a tiny bit using its current velocity.
    const lead = this._predict(target, c, s.projSpeed);
    projectiles.push(new Projectile(this, c.x, c.y, lead.x, lead.y, target));
  }

  _predict(target, from, projSpeed) {
    // Solve for where target will be when projectile arrives, iteratively.
    const tilesPerSec = projSpeed; // projSpeed is in tiles/sec; convert later in projectile
    // For simplicity, do one-step prediction.
    const dx = target.x - from.x;
    const dy = target.y - from.y;
    const dist = Math.hypot(dx, dy);
    const t = dist / (projSpeed * GRID.tileSize);
    return { x: target.x + (target.vx || 0) * t, y: target.y + (target.vy || 0) * t };
  }
}
