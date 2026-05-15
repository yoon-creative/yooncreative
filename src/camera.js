import { CAMERA } from "./config.js";

export class Camera {
  constructor(grid) {
    this.grid = grid;
    this.x = grid.worldWidth() / 2;
    this.y = grid.worldHeight() / 2;
    this.zoom = 1;
    this.minZoom = 1;
    this.maxZoom = CAMERA.maxZoom;
    this.viewW = 1; this.viewH = 1;
    this.vx = 0; this.vy = 0;
  }

  resize(viewW, viewH) {
    this.viewW = viewW; this.viewH = viewH;
    const ww = this.grid.worldWidth(), wh = this.grid.worldHeight();
    this.minZoom = Math.min(viewW / ww, viewH / wh);
    if (this.zoom < this.minZoom) this.zoom = this.minZoom;
    if (this.zoom > this.maxZoom) this.zoom = this.maxZoom;
    this.clamp();
  }

  screenToWorld(sx, sy) { return { x: this.x + (sx - this.viewW / 2) / this.zoom, y: this.y + (sy - this.viewH / 2) / this.zoom }; }
  worldToScreen(wx, wy) { return { x: (wx - this.x) * this.zoom + this.viewW / 2, y: (wy - this.y) * this.zoom + this.viewH / 2 }; }

  panScreen(dx, dy) { this.x -= dx / this.zoom; this.y -= dy / this.zoom; this.clamp(); }

  zoomAt(sx, sy, factor) {
    const before = this.screenToWorld(sx, sy);
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
    const after = this.screenToWorld(sx, sy);
    this.x += before.x - after.x; this.y += before.y - after.y;
    this.clamp();
  }

  clamp() {
    const halfW = this.viewW / (2 * this.zoom), halfH = this.viewH / (2 * this.zoom);
    const ww = this.grid.worldWidth(), wh = this.grid.worldHeight();
    this.x = ww * this.zoom <= this.viewW ? ww / 2 : Math.max(halfW, Math.min(ww - halfW, this.x));
    this.y = wh * this.zoom <= this.viewH ? wh / 2 : Math.max(halfH, Math.min(wh - halfH, this.y));
  }

  applyInertia(dt) {
    if (Math.abs(this.vx) < 0.5 && Math.abs(this.vy) < 0.5) { this.vx = 0; this.vy = 0; return; }
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.vx *= Math.pow(CAMERA.panFriction, dt * 60);
    this.vy *= Math.pow(CAMERA.panFriction, dt * 60);
    this.clamp();
  }

  setInertia(vx, vy) { this.vx = vx; this.vy = vy; }
}