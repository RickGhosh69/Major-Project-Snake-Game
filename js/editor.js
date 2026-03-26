// js/editor.js
import { Storage } from './storage.js';

export class LevelEditor {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.grid = opts.grid || 20;
    this.cell = Math.floor(this.canvas.width / this.grid);
    this.mode = 'wall';
    this.walls = [];
    this.food = [];
    this.bind();
    this.draw();
  }

  bind() {
    this.canvas.addEventListener('click', (e) => {
      const r = this.canvas.getBoundingClientRect();
      const x = Math.floor(((e.clientX - r.left) / r.width) * this.grid);
      const y = Math.floor(((e.clientY - r.top) / r.height) * this.grid);
      this.applyAt(x, y);
      this.draw();
    });
  }

  applyAt(x, y) {
    if (this.mode === 'wall') {
      if (!this.walls.some(w => w.x === x && w.y === y)) this.walls.push({ x, y });
    } else if (this.mode === 'food') {
      if (!this.food.some(f => f.x === x && f.y === y)) this.food.push({ x, y });
    } else if (this.mode === 'erase') {
      this.walls = this.walls.filter(w => !(w.x === x && w.y === y));
      this.food = this.food.filter(f => !(f.x === x && f.y === y));
    }
  }

  setMode(m) { this.mode = m; }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    ctx.clearRect(0, 0, w, w);
    const cell = Math.floor(w / this.grid);
    this.cell = cell;

    // grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= this.grid; i++) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, w); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(w, i * cell); ctx.stroke();
    }

    // draw walls
    for (const wall of this.walls) {
      ctx.fillStyle = '#283642';
      ctx.fillRect(wall.x * cell, wall.y * cell, cell, cell);
    }
    // draw food squares
    for (const f of this.food) {
      ctx.fillStyle = '#ffcc00';
      const pad = Math.max(2, Math.floor(cell * 0.12));
      ctx.fillRect(f.x * cell + pad, f.y * cell + pad, cell - pad * 2, cell - pad * 2);
    }
  }

  saveLevel(name) {
    const payload = { name, grid: this.grid, walls: this.walls, food: this.food };
    const levels = Storage.load('levels', []);
    levels.push(payload);
    Storage.save('levels', levels);
    return payload;
  }

  loadList() {
    return Storage.load('levels', []);
  }

  load(level) {
    if (!level) return;
    this.grid = level.grid || this.grid;
    this.walls = level.walls || [];
    this.food = level.food || [];
    this.draw();
  }
}
