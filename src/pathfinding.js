export function findPath(grid, start, goal) {
  const cols = grid.cols;
  const rows = grid.rows;
  if (!inBounds(start, cols, rows) || !inBounds(goal, cols, rows)) return null;

  const key = (c, r) => r * cols + c;
  const open = new MinHeap();
  const cameFrom = new Map();
  const gScore = new Map();
  const closed = new Set();

  const startKey = key(start.col, start.row);
  gScore.set(startKey, 0);
  open.push({ key: startKey, col: start.col, row: start.row, f: heuristic(start, goal) });

  while (open.size() > 0) {
    const current = open.pop();
    if (closed.has(current.key)) continue;
    if (current.col === goal.col && current.row === goal.row) return reconstruct(cameFrom, current, cols);
    closed.add(current.key);

    const neighbors = [
      { col: current.col + 1, row: current.row },
      { col: current.col - 1, row: current.row },
      { col: current.col, row: current.row + 1 },
      { col: current.col, row: current.row - 1 },
    ];

    for (const n of neighbors) {
      if (!inBounds(n, cols, rows)) continue;
      const isGoal = n.col === goal.col && n.row === goal.row;
      if (!isGoal && grid.isBlocked(n.col, n.row)) continue;
      const nKey = key(n.col, n.row);
      if (closed.has(nKey)) continue;
      const tentativeG = (gScore.get(current.key) ?? Infinity) + 1;
      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, current);
        gScore.set(nKey, tentativeG);
        open.push({ key: nKey, col: n.col, row: n.row, f: tentativeG + heuristic(n, goal) });
      }
    }
  }
  return null;
}

function inBounds(p, cols, rows) { return p.col >= 0 && p.col < cols && p.row >= 0 && p.row < rows; }
function heuristic(a, b) { return Math.abs(a.col - b.col) + Math.abs(a.row - b.row); }
function reconstruct(cameFrom, current, cols) {
  const path = [{ col: current.col, row: current.row }];
  let key = current.key;
  while (cameFrom.has(key)) { const prev = cameFrom.get(key); path.push({ col: prev.col, row: prev.row }); key = prev.key; }
  path.reverse();
  return path;
}

class MinHeap {
  constructor() { this.data = []; }
  size() { return this.data.length; }
  push(item) { this.data.push(item); this._siftUp(this.data.length - 1); }
  pop() {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) { this.data[0] = last; this._siftDown(0); }
    return top;
  }
  _siftUp(i) {
    while (i > 0) { const p = (i - 1) >> 1; if (this.data[p].f <= this.data[i].f) break; [this.data[p], this.data[i]] = [this.data[i], this.data[p]]; i = p; }
  }
  _siftDown(i) {
    const n = this.data.length;
    while (true) {
      const l = i * 2 + 1, r = l + 1; let s = i;
      if (l < n && this.data[l].f < this.data[s].f) s = l;
      if (r < n && this.data[r].f < this.data[s].f) s = r;
      if (s === i) break;
      [this.data[s], this.data[i]] = [this.data[i], this.data[s]]; i = s;
    }
  }
}