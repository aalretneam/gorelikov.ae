export const HUMAN = 1;
export const AI = 2;

type Cell = 0 | 1 | 2;
const DIRS: [number, number][] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

export class Gomoku {
  cells = new Map<string, Cell>();
  last: { x: number; y: number; who: Cell } | null = null;
  over: 0 | 1 | 2 = 0;
  moves = 0;
  line: { x: number; y: number }[] = [];

  key(x: number, y: number) {
    return `${x},${y}`;
  }

  at(x: number, y: number): Cell {
    return this.cells.get(this.key(x, y)) ?? 0;
  }

  place(x: number, y: number, who: Cell) {
    if (this.over || this.at(x, y)) return false;
    this.cells.set(this.key(x, y), who);
    this.last = { x, y, who };
    this.moves += 1;
    if (this.wins(x, y, who)) {
      this.over = who;
    }
    return true;
  }

  wins(x: number, y: number, who: Cell) {
    for (const [dx, dy] of DIRS) {
      const line = [{ x, y }];
      let n = 1;
      for (const s of [1, -1]) {
        let cx = x + dx * s;
        let cy = y + dy * s;
        while (this.at(cx, cy) === who) {
          line.push({ x: cx, y: cy });
          n += 1;
          cx += dx * s;
          cy += dy * s;
        }
      }
      if (n >= 5) {
        this.line = line;
        return true;
      }
    }
    return false;
  }

  countDir(x: number, y: number, dx: number, dy: number, who: Cell) {
    let n = 0;
    let open = 0;
    let cx = x + dx;
    let cy = y + dy;
    while (this.at(cx, cy) === who) {
      n += 1;
      cx += dx;
      cy += dy;
    }
    if (this.at(cx, cy) === 0) open += 1;
    return { n, open };
  }

  scorePoint(x: number, y: number, who: Cell) {
    if (this.at(x, y)) return -1;
    const foe = who === HUMAN ? AI : HUMAN;
    let s = 0;
    for (const [dx, dy] of DIRS) {
      const a = this.countDir(x, y, dx, dy, who);
      const b = this.countDir(x, y, -dx, -dy, who);
      const len = a.n + b.n;
      const open = a.open + b.open;
      if (len >= 4) s += 1e7;
      else if (len === 3 && open === 2) s += 80000;
      else if (len === 3 && open === 1) s += 12000;
      else if (len === 2 && open === 2) s += 4000;
      else if (len === 2 && open === 1) s += 600;
      else if (len === 1 && open === 2) s += 180;
      const fa = this.countDir(x, y, dx, dy, foe);
      const fb = this.countDir(x, y, -dx, -dy, foe);
      const fl = fa.n + fb.n;
      const fo = fa.open + fb.open;
      if (fl >= 4) s += 2e6;
      else if (fl === 3 && fo === 2) s += 70000;
      else if (fl === 3 && fo === 1) s += 9000;
      else if (fl === 2 && fo === 2) s += 2200;
    }
    const dist = Math.hypot(x, y);
    s += Math.max(0, 40 - dist);
    return s;
  }

  candidates() {
    const seen = new Set<string>();
    const out: { x: number; y: number }[] = [];
    if (!this.cells.size) return [{ x: 0, y: 0 }];
    for (const key of this.cells.keys()) {
      const [x, y] = key.split(",").map(Number);
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          const k = this.key(nx, ny);
          if (seen.has(k) || this.at(nx, ny)) continue;
          seen.add(k);
          out.push({ x: nx, y: ny });
        }
      }
    }
    return out;
  }

  aiMove() {
    const opts = this.candidates();
    let best = opts[0] ?? { x: 0, y: 0 };
    let bestS = -Infinity;
    for (const p of opts) {
      let s = this.scorePoint(p.x, p.y, AI);
      if (this.moves > 14 && Math.random() < 0.035) s *= 0.88;
      if (s > bestS) {
        bestS = s;
        best = p;
      }
    }
    this.place(best.x, best.y, AI);
    return best;
  }
}
