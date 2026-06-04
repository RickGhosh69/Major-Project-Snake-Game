import { advanceState, createInitialState, queueDirection } from "./snake-core.js";

export class Game {
  constructor(canvas, { gridSize = 20, tickMs = 140, seed = 1, mode = "classic" } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.gridSize = gridSize;
    this.tickMs = tickMs;
    this.seed = seed;
    this.mode = mode;
    this.animationFrameId = 0;
    this.lastTimestamp = 0;
    this.onStateChange = null;
    this.state = createInitialState({ gridSize, tickMs, seed, mode });
    this.resizeToDisplay();
    window.addEventListener("resize", () => this.resizeToDisplay());

    this.render();
    this.publishState();

    window.render_game_to_text = () => this.renderGameToText();
    window.advanceTime = (ms) => this.advanceTime(ms);
  }

  start() {
    cancelAnimationFrame(this.animationFrameId);

    if (this.state.status === "running") {
      return;
    }

    if (this.state.status === "gameover" || this.state.status === "won") {
      this.restart();
    }

    this.state = { ...this.state, status: "running" };
    this.lastTimestamp = 0;
    this.publishState();
    this.render();
    this.scheduleFrame();
  }

  togglePause() {
    if (this.state.status === "idle") {
      this.start();
      return;
    }

    if (this.state.status === "running") {
      this.state = { ...this.state, status: "paused" };
      this.publishState();
      this.render();
      return;
    }

    if (this.state.status === "paused") {
      this.state = { ...this.state, status: "running" };
      this.lastTimestamp = 0;
      this.publishState();
      this.render();
      this.scheduleFrame();
    }
  }

  restart() {
    cancelAnimationFrame(this.animationFrameId);
    this.seed = Date.now();
    this.state = createInitialState({
      gridSize: this.gridSize,
      tickMs: this.tickMs,
      seed: this.seed,
      mode: this.mode
    });
    this.lastTimestamp = 0;
    this.publishState();
    this.render();
  }

  queueDirection(direction) {
    this.state = queueDirection(this.state, direction);
    this.publishState();
  }

  setMode(mode) {
    this.mode = mode;
    this.restart();
  }

  scheduleFrame() {
    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = requestAnimationFrame((timestamp) => this.frame(timestamp));
  }

  frame(timestamp) {
    if (this.state.status !== "running") {
      this.render();
      return;
    }

    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;
    }

    const deltaMs = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    this.state = advanceState(this.state, deltaMs);
    this.publishState();
    this.render();

    if (this.state.status === "running") {
      this.scheduleFrame();
    }
  }

  advanceTime(ms) {
    if (this.state.status !== "running") {
      this.render();
      return this.state;
    }

    this.state = advanceState(this.state, ms);
    this.publishState();
    this.render();
    return this.state;
  }

  publishState() {
    if (typeof this.onStateChange === "function") {
      this.onStateChange(this.state);
    }
  }

  renderGameToText() {
    const head = this.state.snake[0];

    return JSON.stringify({
      coordinateSystem: "origin top-left, x increases right, y increases down",
      status: this.state.status,
      score: this.state.score,
      length: this.state.snake.length,
      direction: this.state.direction.name,
      head,
      foods: this.state.foods,
      gridSize: this.state.gridSize,
      mode: this.state.mode,
      walls: this.state.walls
    });
  }

  drawRoundedRect(x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    this.ctx.beginPath();
    this.ctx.moveTo(x + safeRadius, y);
    this.ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
    this.ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
    this.ctx.arcTo(x, y + height, x, y, safeRadius);
    this.ctx.arcTo(x, y, x + width, y, safeRadius);
    this.ctx.closePath();
  }

  drawBubble(x, y, radius, color, alpha = 0.2) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.beginPath();
    ctx.arc(x - radius * 0.32, y - radius * 0.34, radius * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawBackground({ boardBackground, boardStripe, shadowColor, isNight }) {
    const { ctx, canvas } = this;
    const waterGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    waterGradient.addColorStop(0, boardBackground);
    waterGradient.addColorStop(1, shadowColor);
    ctx.fillStyle = waterGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = boardStripe;
    for (let stripe = -canvas.height; stripe < canvas.width + canvas.height; stripe += 14) {
      ctx.beginPath();
      ctx.moveTo(stripe, 0);
      ctx.lineTo(stripe + canvas.height, canvas.height);
      ctx.lineTo(stripe + canvas.height + 5, canvas.height);
      ctx.lineTo(stripe + 5, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    const glow = ctx.createRadialGradient(
      canvas.width * 0.5,
      canvas.height * 0.42,
      canvas.width * 0.1,
      canvas.width * 0.5,
      canvas.height * 0.42,
      canvas.width * 0.52
    );
    glow.addColorStop(0, "rgba(255, 255, 255, 0.2)");
    glow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (isNight) {
      ctx.save();
      ctx.fillStyle = "rgba(226, 245, 255, 0.06)";
      for (let index = 0; index < 18; index += 1) {
        const x = (canvas.width * (0.08 + (index * 0.051) % 0.82));
        const y = canvas.height * (0.08 + ((index * 37) % 19) / 100);
        ctx.beginPath();
        ctx.arc(x, y, 1.6 + (index % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else {
      const sunGlow = ctx.createRadialGradient(
        canvas.width * 0.16,
        canvas.height * 0.12,
        canvas.width * 0.01,
        canvas.width * 0.16,
        canvas.height * 0.12,
        canvas.width * 0.2
      );
      sunGlow.addColorStop(0, "rgba(255, 250, 214, 0.45)");
      sunGlow.addColorStop(1, "rgba(255, 250, 214, 0)");
      ctx.fillStyle = sunGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
    ctx.lineWidth = 1;
    for (let index = 1; index < this.state.gridSize; index += 1) {
      const offset = index * (canvas.width / this.state.gridSize);
      ctx.beginPath();
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, offset);
      ctx.lineTo(canvas.width, offset);
      ctx.stroke();
    }
  }

  drawAmbientBubbles(cell, shadowColor) {
    const { ctx, canvas } = this;
    const bubbleSpecs = [
      { x: 0.1, y: 0.12, r: 0.3, alpha: 0.16 },
      { x: 0.87, y: 0.14, r: 0.34, alpha: 0.18 },
      { x: 0.82, y: 0.84, r: 0.28, alpha: 0.2 },
      { x: 0.12, y: 0.88, r: 0.5, alpha: 0.12 }
    ];

    bubbleSpecs.forEach((bubble) => {
      this.drawBubble(
        canvas.width * bubble.x,
        canvas.height * bubble.y,
        cell * bubble.r,
        "rgba(255, 255, 255, 0.95)",
        bubble.alpha
      );
    });

    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = shadowColor;
    for (let index = 0; index < 4; index += 1) {
      ctx.beginPath();
      ctx.arc(canvas.width * (0.08 + index * 0.03), canvas.height * (0.16 + index * 0.025), cell * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawCornerPlants(cell, shadowColor) {
    const { ctx } = this;
    const plants = [
      { x: cell * 1.1, y: cell * 18.9, scale: 0.9 },
      { x: cell * 18.5, y: cell * 18.4, scale: 0.78 }
    ];

    plants.forEach((plant) => {
      ctx.save();
      ctx.translate(plant.x, plant.y);
      ctx.scale(plant.scale, plant.scale);
      ctx.strokeStyle = shadowColor;
      ctx.lineWidth = cell * 0.16;
      ctx.lineCap = "round";
      for (let index = 0; index < 3; index += 1) {
        ctx.beginPath();
        ctx.moveTo(index * cell * 0.34, 0);
        ctx.quadraticCurveTo(index * cell * 0.28 - cell * 0.1, -cell * 0.9, index * cell * 0.46 + cell * 0.04, -cell * 1.7);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  drawFood(food, cell, elapsedMs, shadowColor, foodColor) {
    const { ctx } = this;
    const centerX = (food.x + 0.5) * cell;
    const centerY = (food.y + 0.5) * cell;
    const radius = cell * (0.28 + Math.sin(elapsedMs / 180) * 0.015);

    ctx.save();
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.ellipse(centerX + cell * 0.12, centerY + cell * 0.34, radius * 0.96, radius * 0.58, 0, 0, Math.PI * 2);
    ctx.fill();

    const orb = ctx.createRadialGradient(
      centerX - radius * 0.34,
      centerY - radius * 0.42,
      radius * 0.14,
      centerX,
      centerY,
      radius
    );
    orb.addColorStop(0, "#fff0f0");
    orb.addColorStop(0.25, foodColor);
    orb.addColorStop(1, "#da1e1e");
    ctx.fillStyle = orb;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.beginPath();
    ctx.ellipse(centerX - radius * 0.38, centerY - radius * 0.42, radius * 0.24, radius * 0.16, -0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawBombFood(food, cell, elapsedMs, shadowColor) {
    const { ctx } = this;
    const centerX = (food.x + 0.5) * cell;
    const centerY = (food.y + 0.52) * cell;
    const radius = cell * (0.29 + Math.sin(elapsedMs / 180) * 0.01);
    const spark = (elapsedMs / 120) % 1;
    const bombAge = elapsedMs - (food.spawnedAt || 0);
    const flicker = bombAge >= 8000 ? (Math.floor(bombAge / 140) % 2 === 0 ? 0.48 : 1) : 1;

    ctx.save();
    ctx.globalAlpha = flicker;
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.ellipse(centerX + cell * 0.12, centerY + cell * 0.34, radius, radius * 0.56, 0, 0, Math.PI * 2);
    ctx.fill();

    const shell = ctx.createRadialGradient(
      centerX - radius * 0.3,
      centerY - radius * 0.4,
      radius * 0.08,
      centerX,
      centerY,
      radius
    );
    shell.addColorStop(0, "#66767f");
    shell.addColorStop(0.35, "#313d45");
    shell.addColorStop(1, "#12191d");
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#f6d8a6";
    ctx.lineWidth = Math.max(2, cell * 0.05);
    ctx.beginPath();
    ctx.moveTo(centerX + radius * 0.15, centerY - radius * 0.65);
    ctx.quadraticCurveTo(centerX + radius * 0.35, centerY - radius * 1.15, centerX + radius * 0.62, centerY - radius * 1.1);
    ctx.stroke();

    ctx.fillStyle = spark > 0.5 ? "#ffdb4d" : "#ff7a1f";
    ctx.beginPath();
    ctx.moveTo(centerX + radius * 0.8, centerY - radius * 1.12);
    ctx.lineTo(centerX + radius * 1.02, centerY - radius * 0.92);
    ctx.lineTo(centerX + radius * 0.76, centerY - radius * 0.86);
    ctx.lineTo(centerX + radius * 0.98, centerY - radius * 0.66);
    ctx.lineTo(centerX + radius * 0.68, centerY - radius * 0.7);
    ctx.lineTo(centerX + radius * 0.58, centerY - radius * 0.46);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawFoodGroup(cell, elapsedMs, shadowColor, foodColor) {
    this.state.foods.forEach((food) => {
      if (food.type === "bomb") {
        this.drawBombFood(food, cell, elapsedMs, shadowColor);
      } else {
        this.drawFood(food, cell, elapsedMs, shadowColor, foodColor);
      }
    });
  }

  drawSnakeSegment(segment, cell, fillColor, shadowColor) {
    const { ctx } = this;
    const centerX = (segment.x + 0.5) * cell;
    const centerY = (segment.y + 0.5) * cell;
    const radius = cell * 0.38;

    ctx.save();
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.ellipse(centerX + cell * 0.14, centerY + cell * 0.35, radius * 1.02, radius * 0.56, 0, 0, Math.PI * 2);
    ctx.fill();

    const bead = ctx.createRadialGradient(
      centerX - radius * 0.34,
      centerY - radius * 0.42,
      radius * 0.12,
      centerX,
      centerY,
      radius
    );
    bead.addColorStop(0, "#ffffff");
    bead.addColorStop(0.52, fillColor);
    bead.addColorStop(1, "#e7e0d6");
    ctx.fillStyle = bead;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawSnakeHead(head, direction, cell, fillColor, shadowColor) {
    const { ctx } = this;
    const centerX = (head.x + 0.5) * cell;
    const centerY = (head.y + 0.5) * cell;
    const radius = cell * 0.44;
    const rotation = Math.atan2(direction.y, direction.x);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);

    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.ellipse(cell * 0.18, cell * 0.34, radius * 1.1, radius * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();

    const face = ctx.createRadialGradient(-radius * 0.28, -radius * 0.38, radius * 0.1, 0, 0, radius);
    face.addColorStop(0, "#ffffff");
    face.addColorStop(0.72, fillColor);
    face.addColorStop(1, "#ebe1d6");
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    const eyeSpecs = [
      { x: -radius * 0.34, y: -radius * 0.08 },
      { x: radius * 0.26, y: -radius * 0.06 }
    ];

    eyeSpecs.forEach((eye) => {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(eye.x, eye.y, radius * 0.28, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#111111";
      ctx.beginPath();
      ctx.arc(eye.x + radius * 0.02, eye.y + radius * 0.04, radius * 0.14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(eye.x - radius * 0.04, eye.y - radius * 0.05, radius * 0.05, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.strokeStyle = "#d54d4a";
    ctx.lineWidth = Math.max(2, cell * 0.05);
    ctx.beginPath();
    ctx.arc(0, radius * 0.16, radius * 0.22, 0.15 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(1.4, cell * 0.026);
    ctx.beginPath();
    ctx.moveTo(-radius * 0.12, radius * 0.34);
    ctx.lineTo(0, radius * 0.56);
    ctx.stroke();

    ctx.restore();
  }

  drawWalls(cell, wallColors, shadowColor) {
    this.state.walls.forEach((wall) => {
      const x = wall.x * cell + cell * 0.08;
      const y = wall.y * cell + cell * 0.08;
      const size = cell * 0.84;

      this.ctx.save();
      this.ctx.fillStyle = shadowColor;
      this.drawRoundedRect(x + cell * 0.1, y + cell * 0.18, size, size * 0.88, cell * 0.18);
      this.ctx.fill();

      const block = this.ctx.createLinearGradient(x, y, x, y + size);
      block.addColorStop(0, wallColors.top);
      block.addColorStop(1, wallColors.base);
      this.ctx.fillStyle = block;
      this.drawRoundedRect(x, y, size, size, cell * 0.18);
      this.ctx.fill();

      this.ctx.strokeStyle = wallColors.line;
      this.ctx.lineWidth = Math.max(1.4, cell * 0.035);
      this.drawRoundedRect(x, y, size, size, cell * 0.18);
      this.ctx.stroke();

      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      this.ctx.beginPath();
      this.ctx.moveTo(x + size * 0.18, y + size * 0.26);
      this.ctx.lineTo(x + size * 0.74, y + size * 0.26);
      this.ctx.stroke();
      this.ctx.restore();
    });
  }

  render() {
    this.resizeToDisplay();
    const { ctx, canvas } = this;
    const cell = canvas.width / this.state.gridSize;
    const theme = getComputedStyle(document.body);
    const boardBackground = theme.getPropertyValue("--board-bg").trim() || "#08111f";
    const boardStripe = theme.getPropertyValue("--board-stripe").trim() || "rgba(255, 255, 255, 0.08)";
    const foodColor = theme.getPropertyValue("--board-food").trim() || "#ffca28";
    const snakeHeadColor = theme.getPropertyValue("--board-snake-head").trim() || "#fffdf7";
    const snakeBodyColor = theme.getPropertyValue("--board-snake-body").trim() || "#fffaf0";
    const overlayColor = theme.getPropertyValue("--board-overlay").trim() || "rgba(2, 6, 23, 0.54)";
    const overlayText = theme.getPropertyValue("--board-overlay-text").trim() || "#eef3ff";
    const shadowColor = theme.getPropertyValue("--board-shadow").trim() || "rgba(36, 138, 136, 0.28)";
    const wallBase = theme.getPropertyValue("--board-wall-base").trim() || "#d35a4c";
    const wallTop = theme.getPropertyValue("--board-wall-top").trim() || "#ffb06d";
    const wallLine = theme.getPropertyValue("--board-wall-line").trim() || "rgba(97, 39, 32, 0.4)";
    const elapsedMs = this.state.elapsedMs + performance.now() * 0.08;
    const isNight = document.body.dataset.theme === "night";
    const wallColors = { base: wallBase, top: wallTop, line: wallLine };

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.drawBackground({ boardBackground, boardStripe, shadowColor, isNight });
    this.drawAmbientBubbles(cell, shadowColor);
    this.drawCornerPlants(cell, shadowColor);

    if (this.state.foods.length > 0) {
      this.drawFoodGroup(cell, elapsedMs, shadowColor, foodColor);
    }

    if (this.state.walls.length > 0) {
      this.drawWalls(cell, wallColors, shadowColor);
    }

    this.state.snake.slice(1).reverse().forEach((segment) => {
      this.drawSnakeSegment(segment, cell, snakeBodyColor, shadowColor);
    });
    this.drawSnakeHead(this.state.snake[0], this.state.direction, cell, snakeHeadColor, shadowColor);

    if (
      this.state.status === "idle" ||
      this.state.status === "paused" ||
      this.state.status === "gameover" ||
      this.state.status === "won"
    ) {
      ctx.fillStyle = overlayColor;
      this.drawRoundedRect(cell * 0.9, canvas.height * 0.38, canvas.width - cell * 1.8, cell * 3.7, 28);
      ctx.fill();
      ctx.fillStyle = overlayText;
      ctx.font = "700 36px 'Trebuchet MS', 'Avenir Next', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        this.state.status === "gameover"
          ? "Game Over"
          : this.state.status === "paused"
            ? "Paused"
            : this.state.status === "won"
              ? "You Win"
              : `${this.state.modeLabel} Snake`,
        canvas.width / 2,
        canvas.height / 2 - 12
      );
      ctx.font = "400 18px 'Trebuchet MS', 'Avenir Next', sans-serif";
      const subcopy =
        this.state.status === "gameover"
          ? "Press Restart to try again."
          : this.state.status === "paused"
            ? "Press Pause, Space, or P to resume."
            : this.state.status === "won"
              ? "Press Restart for a fresh board."
              : "Press Start when you are ready.";
      ctx.fillText(subcopy, canvas.width / 2, canvas.height / 2 + 24);
    }
  }

  resizeToDisplay() {
    const size = Math.max(280, Math.floor(this.canvas.getBoundingClientRect().width || 600));
    const nextSize = Math.min(680, size);

    if (this.canvas.width !== nextSize || this.canvas.height !== nextSize) {
      this.canvas.width = nextSize;
      this.canvas.height = nextSize;
    }
  }
}
