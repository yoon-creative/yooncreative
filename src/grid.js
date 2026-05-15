import { GRID } from "./config.js";
import { findPath } from "./pathfinding.js";

export class Grid {
  constructor() {
    this.cols = GRID.cols;
    this.rows = GRID.rows;
    this.tile = GRID.tileSize;
    this.spawn = { col: GRID.spawnCol, row: 0 };
    this.exit  = { col: GRID.exitCol,  row: this.rows - 1 };
    this.cells = new Array(this.cols * this.rows).fill(null); // tower or null
    this._cachedPath = null;
  }

  worldWidth()  { return this.cols * this.tile; }
  worldHeight() { return this.rows * this.tile; }

  idx(c, r) { return r * this.cols + c; }
  inBounds(c, r) { return c >= 0 && c < this.cols && r >= 0 && r < this.rows; }

  getTower(c, r) {
    if (!this.inBounds(c, r)) return null;
    return this.cells[this.idx(c, r)];
  }

  isBlocked(c, r) {
    if (!this.inBounds(c, r)) return true;
    return this.cells[this.idx(c, r)] !== null;
  }

  // Spawn/exit cells must remain walkable
  isReserved(c, r) {
    return (c === this.spawn.col && r === this.spawn.row) ||
           (c === this.exit.col  && r === this.exit.row);
  }

  // Try to place a tower; reject if it would block the path entirely.
  canPlace(c, r) {
    if (!this.inBounds(c, r)) return false;
    if (this.isReserved(c, r)) return false;
    if (this.cells[this.idx(c, r)] !== null) return false;
    // Provisionally block and re-pathfind. If unreachable, reject.
    this.cells[this.idx(c, r)] = { __probe: true };
    const path = findPath(this, this.spawn, this.exit);
    this.cells[this.idx(c, r)] = null;
    return path !== null;
  }

  placeTower(c, r, tower) {
    if (!this.canPlace(c, r)) return false;
    this.cells[this.idx(c, r)] = tower;
    tower.col = c; tower.row = r;
    this._cachedPath = null;
    return true;
  }

  removeTower(c, r) {
    if (!this.inBounds(c, r)) return null;
    const t = this.cells[this.idx(c, r)];
    this.cells[this.idx(c, r)] = null;
    if (t) this._cachedPath = null;
    return t;
  }

  computePath() {
    if (this._cachedPath) return this._cachedPath;
    this._cachedPath = findPath(this, this.spawn, this.exit);
    return this._cachedPath;
  }

  invalidatePath() { this._cachedPath = null; }

  worldToCell(wx, wy) {
    return {
      col: Math.floor(wx / this.tile),
      row: Math.floor(wy / this.tile),
    };
  }

  cellCenterWorld(c, r) {
    return {
      x: c * this.tile + this.tile / 2,
      y: r * this.tile + this.tile / 2,
    };
  }

  forEachTower(fn) {
    for (let i = 0; i < this.cells.length; i++) {
      const t = this.cells[i];
      if (t) fn(t);
    }
  }
}
