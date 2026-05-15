import { GRID } from "./config.js";

export class Projectile {
  constructor(tower, x, y, tx, ty, target) {
    this.tower = tower;
    this.typeId = tower.typeId;
    this.x = x; this.y = y;
    this.target = target;
    this.dead = false;
    const s = tower.stats();
    this.dmg = s.dmg;
    this.splash = s.splash || 0;          // in tiles
    this.slow = s.slow || 0;              // 0..1
    this.slowDur = s.slowDur || 0;
    this.stunDur = s.stunDur || 0;
    this.chain = s.chain || 0;
    this.chainRange = (s.chainRange || 0) * GRID.tileSize;
    this.color = s.projColor;
    this.speed = s.projSpeed * GRID.tileSize; // world px / sec
    const dx = tx - x, dy = ty - y;
    const d = Math.hypot(dx, dy) || 1;
    this.vx = dx / d * this.speed;
    this.vy = dy / d * this.speed;
    this.life = 2.5;
    this.trail = [];
  }

  update(dt, enemies, effects) {
    if (this.dead) return;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }

    // Track straight; for chain (ether) and homing-ish, mild homing.
    if (this.target && !this.target.dead && !this.target.escaped) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      // Light homing
      const homing = (this.typeId === "ether" || this.typeId === "water") ? 0.18 : 0.05;
      this.vx = this.vx * (1 - homing) + (dx / d * this.speed) * homing;
      this.vy = this.vy * (1 - homing) + (dy / d * this.speed) * homing;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.trail.push({ x: this.x, y: this.y, t: 0.18 });
    if (this.trail.length > 8) this.trail.shift();
    for (const p of this.trail) p.t -= dt;

    // Hit detection: nearest enemy within hit radius
    const hitR = 0.45 * GRID.tileSize;
    let hit = null;
    let bestD = hitR * hitR;
    for (const e of enemies) {
      if (e.dead || e.escaped) continue;
      const dx = e.x - this.x, dy = e.y - this.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD) { bestD = d2; hit = e; }
    }
    if (!hit) return;

    // Apply effects
    this._applyHit(hit, enemies, effects);
    this.dead = true;
  }

  _applyHit(target, enemies, effects) {
    const apply = (e, mult = 1) => {
      e.takeDamage(this.dmg * mult);
      if (this.slow > 0) e.applySlow(this.slow, this.slowDur);
      if (this.stunDur > 0) e.applyStun(this.stunDur);
    };

    apply(target, 1);
    effects.push({ type: "hit", x: target.x, y: target.y, color: this.color, t: 0.3, max: 0.3, r: GRID.tileSize * 0.4 });

    // Splash (fire)
    if (this.splash > 0) {
      const r = this.splash * GRID.tileSize;
      const r2 = r * r;
      for (const e of enemies) {
        if (e === target || e.dead || e.escaped) continue;
        const dx = e.x - target.x, dy = e.y - target.y;
        if (dx * dx + dy * dy <= r2) apply(e, 0.6);
      }
      effects.push({ type: "splash", x: target.x, y: target.y, color: this.color, t: 0.45, max: 0.45, r });
    }

    // Chain (ether)
    if (this.chain > 0) {
      let prev = target;
      const hitSet = new Set([target]);
      for (let i = 0; i < this.chain; i++) {
        let next = null;
        let bestD = this.chainRange * this.chainRange;
        for (const e of enemies) {
          if (hitSet.has(e) || e.dead || e.escaped) continue;
          const dx = e.x - prev.x, dy = e.y - prev.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestD) { bestD = d2; next = e; }
        }
        if (!next) break;
        apply(next, 0.7);
        effects.push({ type: "chain", x1: prev.x, y1: prev.y, x2: next.x, y2: next.y, color: this.color, t: 0.18, max: 0.18 });
        hitSet.add(next);
        prev = next;
      }
    }
  }
}
