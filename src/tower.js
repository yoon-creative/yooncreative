import { TOWERS, UPGRADE, GRID } from "./config.js";
import { Projectile } from "./projectile.js";

export class Tower {
  constructor(typeId, col, row) {
    this.type = TOWERS[typeId]; this.typeId = typeId;
    this.col = col; this.row = row;
    this.level = 1; this.cooldown = 0; this.angle = 0;
    this.totalSpent = this.type.cost; this.firePulse = 0;
  }
  stats() { return this.type.levels[this.level - 1]; }
  upgradeCost() { if (this.level >= 5) return null; return Math.round(this.type.cost * UPGRADE.multipliers[this.level - 1]); }
  sellValue() { return Math.floor(this.totalSpent * UPGRADE.sellRefund); }
  upgrade() { if (this.level >= 5) return false; this.totalSpent += this.upgradeCost(); this.level++; return true; }
  centerWorld() { return { x: this.col * GRID.tileSize + GRID.tileSize / 2, y: this.row * GRID.tileSize + GRID.tileSize / 2 }; }
  rangeWorld() { return this.stats().range * GRID.tileSize; }

  pickTarget(enemies) {
    const c = this.centerWorld(), r = this.rangeWorld();
    let best = null, bestProgress = -Infinity;
    for (const e of enemies) {
      if (e.dead || e.escaped) continue;
      const dx = e.x - c.x, dy = e.y - c.y;
      if (dx * dx + dy * dy > r * r) continue;
      if (e.progress > bestProgress) { best = e; bestProgress = e.progress; }
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
    this.cooldown = 1 / s.fireRate; this.firePulse = 0.12;
    const dist = Math.hypot(dx, dy);
    const t = dist / (s.projSpeed * GRID.tileSize);
    const lead = { x: target.x + (target.vx || 0) * t, y: target.y + (target.vy || 0) * t };
    projectiles.push(new Projectile(this, c.x, c.y, lead.x, lead.y, target));
  }
}