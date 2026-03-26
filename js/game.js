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
      food: this.state.food,
      gridSize: this.state.gridSize,
      mode: this.state.mode,
      walls: this.state.walls
    });
  }

  render() {
    this.resizeToDisplay();
    const { ctx, canvas } = this;
    const cell = canvas.width / this.state.gridSize;
    const theme = getComputedStyle(document.body);
    const boardBackground = theme.getPropertyValue("--board-bg").trim() || "#08111f";
    const boardGrid = theme.getPropertyValue("--board-grid").trim() || "rgba(255, 255, 255, 0.05)";
    const foodColor = theme.getPropertyValue("--board-food").trim() || "#ffca28";
    const snakeHeadColor = theme.getPropertyValue("--board-snake-head").trim() || "#4ade80";
    const snakeBodyColor = theme.getPropertyValue("--board-snake-body").trim() || "#22c55e";
    const overlayColor = theme.getPropertyValue("--board-overlay").trim() || "rgba(2, 6, 23, 0.54)";
    const overlayText = theme.getPropertyValue("--board-overlay-text").trim() || "#eef3ff";

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = boardBackground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = boardGrid;
    ctx.lineWidth = 1;
    for (let index = 0; index <= this.state.gridSize; index += 1) {
      const offset = index * cell;
      ctx.beginPath();
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, offset);
      ctx.lineTo(canvas.width, offset);
      ctx.stroke();
    }

    if (this.state.food) {
      const foodInset = Math.max(4, cell * 0.2);
      ctx.fillStyle = foodColor;
      ctx.fillRect(
        this.state.food.x * cell + foodInset,
        this.state.food.y * cell + foodInset,
        cell - foodInset * 2,
        cell - foodInset * 2
      );
    }

    this.state.snake.forEach((segment, index) => {
      const inset = index === 0 ? 3 : 4;
      ctx.fillStyle = index === 0 ? snakeHeadColor : snakeBodyColor;
      ctx.fillRect(
        segment.x * cell + inset,
        segment.y * cell + inset,
        cell - inset * 2,
        cell - inset * 2
      );
    });

    if (this.state.walls.length > 0) {
      ctx.fillStyle = theme.getPropertyValue("--button-bg").trim() || "#172033";
      this.state.walls.forEach((wall) => {
        ctx.fillRect(wall.x * cell + 2, wall.y * cell + 2, cell - 4, cell - 4);
      });
    }

    if (
      this.state.status === "idle" ||
      this.state.status === "paused" ||
      this.state.status === "gameover" ||
      this.state.status === "won"
    ) {
      ctx.fillStyle = overlayColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = overlayText;
      ctx.font = "700 36px Inter, system-ui, sans-serif";
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
      ctx.font = "400 18px Inter, system-ui, sans-serif";
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
