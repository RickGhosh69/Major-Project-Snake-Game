import { Storage } from "./storage.js";

export const UI = {
  init({ game, controls }) {
    this.game = game;
    this.controls = controls;

    this.descBox = document.getElementById("modeDescription");
    this.modeSelect = document.getElementById("modeSelect");
    this.startBtn = document.getElementById("startBtn");

    this.scoreEl = document.getElementById("score");
    this.lengthEl = document.getElementById("length");
    this.timeEl = document.getElementById("time");

    this.themeToggle = document.getElementById("themeToggle");
    this.themeIcon = document.getElementById("themeIcon");

    this.gridSizeEl = document.getElementById("gridSize");

    this.playerName = document.getElementById("playerName");
    this.saveScoreBtn = document.getElementById("saveScoreBtn");
    this.hsList = document.getElementById("highscores");

    this.resetBtn = document.getElementById("resetDataBtn");

    this.hookEvents();
    this.refreshHS();
  },

  hookEvents() {
    this.startBtn.addEventListener("click", () => this.startGame());

    this.gridSizeEl.addEventListener("input", e => {
      this.game.setGridSize(parseInt(e.target.value));
    });

    this.saveScoreBtn.addEventListener("click", () => this.saveHS());

    this.resetBtn.addEventListener("click", () => {
      Storage.reset();
      this.refreshHS();
    });

    this.themeToggle.addEventListener("click", () => this.toggleTheme());

    this.game.onUpdate = d => {
      this.scoreEl.textContent = d.score;
      this.lengthEl.textContent = d.length;

      const mm = String(Math.floor((performance.now() - this.game.startTime) / 60000)).padStart(2, "0");
      const ss = String(Math.floor(((performance.now() - this.game.startTime) / 1000) % 60)).padStart(2, "0");

      this.timeEl.textContent = `${mm}:${ss}`;
    };
  },

  startGame() {
    const mode = this.modeSelect.value;

    this.game.setMode(mode);

    this.descBox.textContent = {
      classic: "Classic Mode: Eat food and grow longer.",
      hard: "Hard Mode: Faster and more challenging.",
      maze: "Maze Mode: Walls appear around the map.",
      infinite: "Infinite Mode: You wrap around edges."
    }[mode];

    this.game.start();
  },

  toggleTheme() {
    document.body.classList.toggle("light");

    if (document.body.classList.contains("light"))
      this.themeIcon.textContent = "☀️";
    else
      this.themeIcon.textContent = "🌙";
  },

  saveHS() {
    const name = this.playerName.value.trim() || "Player";
    const hs = Storage.load();

    hs.push({ name, score: this.game.score });
    hs.sort((a, b) => b.score - a.score);

    Storage.save(hs.slice(0, 20));
    this.refreshHS();
  },

  refreshHS() {
    const hs = Storage.load();
    this.hsList.innerHTML = "";
    hs.forEach(h => {
      const li = document.createElement("li");
      li.textContent = `${h.name} - ${h.score}`;
      this.hsList.appendChild(li);
    });
  },
};
