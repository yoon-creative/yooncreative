import { CAMERA } from "./config.js";

// Camera handles world<->screen transforms, zoom, pan, and inertia.
export class Camera {
  constructor(grid) {
    this.grid = grid;
    this.x = grid.worldWidth() / 2;   // world coord at viewport center
    this.y = grid.worldHeight() / 2;
    this.zoom = 1;                     // computed in resize()
    this.minZoom = 1;
    this.maxZoom = CAMERA.maxZoom;
    this.viewW = 1;
    this.viewH = 1;
    this.vx = 0; this.vy = 0;          // pan inertia in world units / sec
  }

  resize(viewW, viewH) {
    this.viewW = viewW;
    this.viewH = viewH;
    // Min zoom = whichever axis fits the entire grid into the viewport.
    const ww = this.grid.worldWidth();
    const wh = this.grid.worldHeight();
    this.minZoom = Math.min(viewW / ww, viewH / wh);
    if (this.zoom < this.minZoom) this.zoom = this.minZoom;
    if (this.zoom > this.maxZoom) this.zoom = this.maxZoom;
    this.clamp();
  }

  // Convert screen pixel -> world pixel
  screenToWorld(sx, sy) {
    return {
      x: this.x + (sx - this.viewW / 2) / this.zoom,
      y: this.y + (sy - this.viewH / 2) / this.zoom,
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.zoom + this.viewW / 2,
      y: (wy - this.y) * this.zoom + this.viewH / 2,
    };
  }

  // Pan by screen delta (i.e. drag).
  panScreen(dx, dy) {
    this.x -= dx / this.zoom;
    this.y -= dy / this.zoom;
    this.clamp();
  }

  // Zoom around a screen anchor point (so pinch zooms toward fingers).
  zoomAt(sx, sy, factor) {
    const before = this.screenToWorld(sx, sy);
    let nz = this.zoom * factor;
    nz = Math.max(this.minZoom, Math.min(this.maxZoom, nz));
    this.zoom = nz;
    const after = this.screenToWorld(sx, sy);
    this.x += before.x - after.x;
    this.y += before.y - after.y;
    this.clamp();
  }

  // Constrain camera so we never see outside the world (when zoomed past min).
  clamp() {
    const halfW = this.viewW / (2 * this.zoom);
    const halfH = this.viewH / (2 * this.zoom);
    const ww = this.grid.worldWidth();
    const wh = this.grid.worldHeight();

    if (ww * this.zoom <= this.viewW) {
      this.x = ww / 2;
    } else {
      this.x = Math.max(halfW, Math.min(ww - halfW, this.x));
    }
    if (wh * this.zoom <= this.viewH) {
      this.y = wh / 2;
    } else {
      this.y = Math.max(halfH, Math.min(wh - halfH, this.y));
    }
  }

  applyInertia(dt) {
    if (Math.abs(this.vx) < 0.5 && Math.abs(this.vy) < 0.5) {
      this.vx = 0; this.vy = 0; return;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= Math.pow(CAMERA.panFriction, dt * 60);
    this.vy *= Math.pow(CAMERA.panFriction, dt * 60);
    this.clamp();
  }

  setInertia(vx, vy) { this.vx = vx; this.vy = vy; }
}
