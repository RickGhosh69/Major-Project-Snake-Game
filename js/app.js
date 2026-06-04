import { Game } from "./game.js";
import { AudioManager } from "./audio.js";

const canvas = document.getElementById("gameCanvas");
const startButton = document.getElementById("startBtn");
const pauseButton = document.getElementById("pauseBtn");
const restartButton = document.getElementById("restartBtn");
const modeSelect = document.getElementById("modeSelect");
const soundButton = document.getElementById("soundBtn");
const themeButton = document.getElementById("themeBtn");
const themeLabel = document.getElementById("themeLabel");
const statusBanner = document.getElementById("statusBanner");
const scoreValue = document.getElementById("scoreValue");
const lengthValue = document.getElementById("lengthValue");
const statusValue = document.getElementById("statusValue");
const modeValue = document.getElementById("modeValue");
const touchButtons = document.querySelectorAll(".touch-btn");
const themeStorageKey = "classic-snake-theme";
const soundStorageKey = "classic-snake-sound";

const directions = {
  up: { x: 0, y: -1, name: "up" },
  down: { x: 0, y: 1, name: "down" },
  left: { x: -1, y: 0, name: "left" },
  right: { x: 1, y: 0, name: "right" }
};

const bannerByStatus = {
  idle: "Press Start to begin. Use arrow keys or WASD.",
  running: "Stay in motion, grab food, and avoid every hazard.",
  paused: "Paused. Press Pause, Space, or P to jump back in.",
  gameover: "Game over. Restart to run it back.",
  won: "Board cleared. Restart for another round."
};

const modeDescriptions = {
  classic: "Classic mode keeps the original pace and a clean open board.",
  hard: "Hard mode increases the tick speed for a tougher run.",
  maze: "Maze mode adds scrappy obstacle clusters while keeping your spawn lane clear.",
  infinite: "Infinite mode wraps the snake around screen edges."
};

const game = new Game(canvas, {
  gridSize: 20,
  tickMs: 140,
  seed: Date.now(),
  mode: "classic"
});
const audio = new AudioManager();
let previousState = game.state;

function getPreferredTheme() {
  const savedTheme = window.localStorage.getItem(themeStorageKey);
  if (savedTheme === "day" || savedTheme === "night") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches ? "day" : "night";
}

function getPreferredSound() {
  const savedSound = window.localStorage.getItem(soundStorageKey);
  return savedSound !== "off";
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  themeLabel.textContent = theme === "night" ? "Switch to day mode" : "Switch to night mode";
  themeButton.setAttribute("aria-label", themeLabel.textContent);
  window.localStorage.setItem(themeStorageKey, theme);
  game.render();
}

function toggleTheme() {
  const nextTheme = document.body.dataset.theme === "day" ? "night" : "day";

  if (typeof document.startViewTransition === "function") {
    document.startViewTransition(() => applyTheme(nextTheme));
    return;
  }

  applyTheme(nextTheme);
}

function applySoundPreference(isEnabled) {
  audio.setEnabled(isEnabled);
  soundButton.textContent = isEnabled ? "Sound On" : "Sound Off";
  soundButton.setAttribute("aria-label", isEnabled ? "Turn sound off" : "Turn sound on");
  window.localStorage.setItem(soundStorageKey, isEnabled ? "on" : "off");

  if (isEnabled && game.state.status === "running") {
    audio.startMusic();
  }
}

function toggleSound() {
  applySoundPreference(!audio.isEnabled);
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function syncUI(state) {
  scoreValue.textContent = String(state.score);
  lengthValue.textContent = String(state.snake.length);
  statusValue.textContent = titleCase(state.status);
  modeValue.textContent = state.modeLabel;
  modeSelect.value = state.mode;
  statusBanner.textContent = `${modeDescriptions[state.mode]} ${bannerByStatus[state.status]}`;
  pauseButton.textContent = state.status === "paused" ? "Resume" : "Pause";
}

function syncAudio(state) {
  if (!audio.isEnabled) {
    previousState = state;
    return;
  }

  if ((previousState.status === "idle" || previousState.status === "gameover" || previousState.status === "won") && state.status === "running") {
    audio.playStart();
  }

  if (previousState.status !== "running" && state.status === "running") {
    audio.startMusic();
  }

  if (previousState.score < state.score) {
    audio.playEat();
  }

  if (previousState.status !== "gameover" && state.status === "gameover") {
    audio.stopMusic();
    audio.playGameOver();
  }

  if (state.status === "paused" || state.status === "idle" || state.status === "won") {
    audio.stopMusic();
  }

  previousState = state;
}

function handleDirection(name) {
  game.queueDirection(directions[name]);
}

function pulseTouch(button) {
  button.classList.add("is-pressed");
  window.setTimeout(() => {
    button.classList.remove("is-pressed");
  }, 110);

  if (navigator.vibrate) {
    navigator.vibrate(12);
  }
}

function handleKeyboard(event) {
  const key = event.key.toLowerCase();
  const mappedDirection = {
    arrowup: "up",
    w: "up",
    arrowdown: "down",
    s: "down",
    arrowleft: "left",
    a: "left",
    arrowright: "right",
    d: "right"
  }[key];

  if (mappedDirection) {
    event.preventDefault();
    handleDirection(mappedDirection);
    return;
  }

  if (key === " " || key === "p") {
    event.preventDefault();
    game.togglePause();
  }
}

game.onStateChange = (state) => {
  syncUI(state);
  syncAudio(state);
};
applyTheme(getPreferredTheme());
applySoundPreference(getPreferredSound());
syncUI(game.state);
syncAudio(game.state);

window.addEventListener("keydown", handleKeyboard);

startButton.addEventListener("click", () => {
  game.start();
});

pauseButton.addEventListener("click", () => {
  game.togglePause();
});

restartButton.addEventListener("click", () => {
  game.restart();
});

modeSelect.addEventListener("change", () => {
  game.setMode(modeSelect.value);
});

soundButton.addEventListener("click", () => {
  toggleSound();
});

function handleThemeButtonPress(event) {
  event.preventDefault();
  toggleTheme();
}

themeButton.addEventListener("pointerdown", handleThemeButtonPress);
themeButton.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    handleThemeButtonPress(event);
  }
});

touchButtons.forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    pulseTouch(button);

    if (button.dataset.direction) {
      handleDirection(button.dataset.direction);
      return;
    }

    if (button.dataset.action === "pause") {
      game.togglePause();
    }
  });
});
