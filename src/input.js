// Pointer input: pan, pinch zoom, tap. Works for mouse, touch, and stylus.
import { CAMERA } from "./config.js";

export class InputManager {
  constructor(canvas, camera, onTap) {
    this.canvas = canvas;
    this.camera = camera;
    this.onTap = onTap;       // (worldX, worldY, screenX, screenY) => void
    this.pointers = new Map();
    this._lastPanX = 0;
    this._lastPanY = 0;
    this._panSamples = [];
    this._lastPinchDist = 0;
    this._tapStart = null;
    this._dragged = false;

    canvas.addEventListener("pointerdown", this._onDown);
    canvas.addEventListener("pointermove", this._onMove);
    canvas.addEventListener("pointerup", this._onUp);
    canvas.addEventListener("pointercancel", this._onUp);
    canvas.addEventListener("wheel", this._onWheel, { passive: false });
    // Prevent context menu / gesture events from interfering on iOS
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("gesturestart", (e) => e.preventDefault());
  }

  _localPoint(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
    };
  }

  _onDown = (e) => {
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);
    const p = this._localPoint(e);
    this.pointers.set(e.pointerId, p);

    if (this.pointers.size === 1) {
      this._lastPanX = p.x;
      this._lastPanY = p.y;
      this._panSamples = [];
      this._tapStart = { x: p.x, y: p.y, t: performance.now() };
      this._dragged = false;
      this.camera.setInertia(0, 0);
    } else if (this.pointers.size === 2) {
      const pts = [...this.pointers.values()];
      this._lastPinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      this._tapStart = null;
    }
  };

  _onMove = (e) => {
    if (!this.pointers.has(e.pointerId)) return;
    e.preventDefault();
    const p = this._localPoint(e);
    this.pointers.set(e.pointerId, p);

    if (this.pointers.size === 1) {
      const dx = p.x - this._lastPanX;
      const dy = p.y - this._lastPanY;
      if (Math.abs(dx) + Math.abs(dy) > 4) this._dragged = true;
      this.camera.panScreen(dx, dy);
      this._panSamples.push({ dx, dy, t: performance.now() });
      if (this._panSamples.length > 5) this._panSamples.shift();
      this._lastPanX = p.x;
      this._lastPanY = p.y;
    } else if (this.pointers.size === 2) {
      const pts = [...this.pointers.values()];
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const cx = (pts[0].x + pts[1].x) / 2;
      const cy = (pts[0].y + pts[1].y) / 2;
      if (this._lastPinchDist > 0) {
        const factor = dist / this._lastPinchDist;
        this.camera.zoomAt(cx, cy, factor);
      }
      this._lastPinchDist = dist;
    }
  };

  _onUp = (e) => {
    if (!this.pointers.has(e.pointerId)) return;
    e.preventDefault();
    const p = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);

    if (this.pointers.size === 0) {
      // Pan inertia from recent samples
      if (this._panSamples.length > 0) {
        const now = performance.now();
        const recent = this._panSamples.filter(s => now - s.t < 80);
        if (recent.length > 0) {
          const sumDx = recent.reduce((a, s) => a + s.dx, 0);
          const sumDy = recent.reduce((a, s) => a + s.dy, 0);
          const dt = Math.max(16, now - recent[0].t) / 1000;
          // inertia in world units / sec
          const vx = -(sumDx / dt) / this.camera.zoom;
          const vy = -(sumDy / dt) / this.camera.zoom;
          this.camera.setInertia(vx, vy);
        }
      }

      // Tap detection
      if (!this._dragged && this._tapStart) {
        const dur = performance.now() - this._tapStart.t;
        if (dur < 300) {
          const w = this.camera.screenToWorld(p.x, p.y);
          this.onTap(w.x, w.y, p.x, p.y);
        }
      }
      this._tapStart = null;
    } else if (this.pointers.size === 1) {
      const pt = [...this.pointers.values()][0];
      this._lastPanX = pt.x;
      this._lastPanY = pt.y;
      this._lastPinchDist = 0;
    }
  };

  _onWheel = (e) => {
    e.preventDefault();
    const p = this._localPoint(e);
    const factor = Math.exp(-e.deltaY * CAMERA.zoomSpeed);
    this.camera.zoomAt(p.x, p.y, factor);
  };
}
