const DEFAULT_GRID_SIZE = 20;
const DEFAULT_TICK_MS = 140;
const INITIAL_SNAKE = Object.freeze([
  { x: 3, y: 10 },
  { x: 2, y: 10 },
  { x: 1, y: 10 }
]);
const MAZE_SAFE_ZONE = Object.freeze({
  minX: 0,
  maxX: 7,
  minY: 7,
  maxY: 13
});
const BOMB_UNLOCK_SCORE = 5;
const BOMB_UNLOCK_LENGTH = 8;
const BOMB_UNLOCK_MS = 20000;
const BOMB_CHANCE = 0.28;
const BOMB_LIFETIME_MS = 15000;
const BOMB_FLICKER_START_MS = 8000;
const BOMB_REINFORCEMENT_MS = 8000;
const EXTRA_FOOD_SCHEDULE_MS = [0, 12000, 26000];
const NORMAL_FOOD_SCORE = 1;
const BOMB_FOOD_PENALTY = 3;
const BOMB_TAIL_PENALTY = 3;
const MIN_SNAKE_LENGTH = 2;

export const MODE_CONFIGS = Object.freeze({
  classic: { label: "Classic", tickMs: DEFAULT_TICK_MS, wrap: false, maze: false },
  hard: { label: "Hard", tickMs: 95, wrap: false, maze: false },
  maze: { label: "Maze", tickMs: DEFAULT_TICK_MS, wrap: false, maze: true },
  infinite: { label: "Infinite", tickMs: DEFAULT_TICK_MS, wrap: true, maze: false }
});

export const DIRECTIONS = Object.freeze({
  up: { x: 0, y: -1, name: "up" },
  down: { x: 0, y: 1, name: "down" },
  left: { x: -1, y: 0, name: "left" },
  right: { x: 1, y: 0, name: "right" }
});

function nextSeed(seed) {
  return (seed * 1664525 + 1013904223) >>> 0;
}

function randomCell(seed, gridSize) {
  const xSeed = nextSeed(seed);
  const ySeed = nextSeed(xSeed);

  return {
    seed: ySeed,
    cell: {
      x: xSeed % gridSize,
      y: ySeed % gridSize
    }
  };
}

function cellsMatch(a, b) {
  return a.x === b.x && a.y === b.y;
}

function isOppositeDirection(current, next) {
  return current.x + next.x === 0 && current.y + next.y === 0;
}

function createMazeWalls(gridSize) {
  const wallMap = new Map();
  const clusters = [
    { x: 5, y: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]] },
    { x: 8, y: 14, cells: [[0, 0], [1, 0], [1, -1], [2, -1], [3, -1], [3, 0]] },
    { x: 10, y: 6, cells: [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2]] },
    { x: 13, y: 10, cells: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]] },
    { x: 14, y: 4, cells: [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2]] },
    { x: 15, y: 15, cells: [[0, 0], [1, 0], [1, -1], [2, -1], [2, -2]] }
  ];

  const isInsideSafeZone = (x, y) =>
    x >= MAZE_SAFE_ZONE.minX &&
    x <= MAZE_SAFE_ZONE.maxX &&
    y >= MAZE_SAFE_ZONE.minY &&
    y <= MAZE_SAFE_ZONE.maxY;

  clusters.forEach((cluster) => {
    cluster.cells.forEach(([dx, dy]) => {
      const x = cluster.x + dx;
      const y = cluster.y + dy;

      if (x < 1 || y < 1 || x >= gridSize - 1 || y >= gridSize - 1 || isInsideSafeZone(x, y)) {
        return;
      }

      wallMap.set(`${x}:${y}`, { x, y });
    });
  });

  return Array.from(wallMap.values());
}

function shouldSpawnBomb(stateLike) {
  return (
    stateLike.score >= BOMB_UNLOCK_SCORE ||
    stateLike.snake.length >= BOMB_UNLOCK_LENGTH ||
    stateLike.elapsedMs >= BOMB_UNLOCK_MS
  );
}

function desiredNormalFoodCount(elapsedMs) {
  let count = 0;

  EXTRA_FOOD_SCHEDULE_MS.forEach((timeMs) => {
    if (elapsedMs >= timeMs) {
      count += 1;
    }
  });

  return Math.min(3, Math.max(1, count));
}

function normalizeFood(food, overrides = {}) {
  return {
    type: "normal",
    spawnedAt: 0,
    expiresAt: null,
    reinforcementAt: null,
    reinforcementSpawned: false,
    ...food,
    ...overrides
  };
}

function getModeConfig(mode) {
  return MODE_CONFIGS[mode] || MODE_CONFIGS.classic;
}

export function createInitialState({ gridSize = DEFAULT_GRID_SIZE, tickMs = DEFAULT_TICK_MS, seed = 1, mode = "classic" } = {}) {
  const config = getModeConfig(mode);
  const snake = INITIAL_SNAKE.map((segment) => ({ ...segment }));
  const walls = config.maze ? createMazeWalls(gridSize) : [];
  const foodPlacement = placeFood({
    snake,
    walls,
    gridSize,
    seed: seed >>> 0,
    allowBomb: false
  });

  return {
    gridSize,
    tickMs: tickMs === DEFAULT_TICK_MS ? config.tickMs : tickMs,
    mode,
    modeLabel: config.label,
    wrap: config.wrap,
    walls,
    status: "idle",
    score: 0,
    snake,
    direction: DIRECTIONS.right,
    nextDirection: DIRECTIONS.right,
    food: foodPlacement.food,
    foods: foodPlacement.food ? [normalizeFood(foodPlacement.food)] : [],
    elapsedMs: 0,
    accumulatorMs: 0,
    seed: foodPlacement.seed
  };
}

export function queueDirection(state, direction) {
  if (!direction || state.status === "gameover" || state.status === "won") {
    return state;
  }

  if (state.nextDirection !== state.direction) {
    return state;
  }

  if (isOppositeDirection(state.direction, direction)) {
    return state;
  }

  return {
    ...state,
    nextDirection: direction
  };
}

export function advanceState(state, deltaMs) {
  if (state.status !== "running") {
    return state;
  }

  let nextState = {
    ...state,
    elapsedMs: state.elapsedMs + deltaMs,
    accumulatorMs: state.accumulatorMs + deltaMs
  };

  while (nextState.accumulatorMs >= nextState.tickMs && nextState.status === "running") {
    nextState = step(nextState);
  }

  return nextState;
}

export function placeFood({ snake, gridSize, seed, walls = [], foods = [], allowBomb = false }) {
  const totalCells = gridSize * gridSize;
  const availableCells = totalCells - walls.length;

  if (snake.length >= availableCells) {
    return {
      seed,
      food: null
    };
  }

  let currentSeed = seed;
  let candidate;

  do {
    const random = randomCell(currentSeed, gridSize);
    currentSeed = random.seed;
    candidate = random.cell;
  } while (
    snake.some((segment) => cellsMatch(segment, candidate)) ||
    walls.some((wall) => cellsMatch(wall, candidate)) ||
    foods.some((food) => cellsMatch(food, candidate))
  );

  return {
    seed: currentSeed,
    food: normalizeFood({
      ...candidate,
      type: allowBomb && currentSeed % 100 < BOMB_CHANCE * 100 ? "bomb" : "normal"
    })
  };
}

function spawnFood(state, overrides = {}, allowBomb = false) {
  const placement = placeFood({
    snake: state.snake,
    walls: state.walls,
    foods: state.foods,
    gridSize: state.gridSize,
    seed: state.seed,
    allowBomb
  });

  return {
    seed: placement.seed,
    food: placement.food ? normalizeFood(placement.food, overrides) : null
  };
}

function fillNormalFoods(state, foods, count) {
  let nextFoods = [...foods];
  let nextSeed = state.seed;

  while (nextFoods.filter((food) => food.type === "normal").length < count) {
    const placement = placeFood({
      snake: state.snake,
      walls: state.walls,
      foods: nextFoods,
      gridSize: state.gridSize,
      seed: nextSeed,
      allowBomb: false
    });

    nextSeed = placement.seed;

    if (!placement.food) {
      break;
    }

    nextFoods.push(normalizeFood(placement.food, { spawnedAt: state.elapsedMs }));
  }

  return {
    foods: nextFoods,
    seed: nextSeed
  };
}

function syncFoods(state) {
  let nextFoods = (state.foods ?? (state.food ? [state.food] : [])).map((food) => ({ ...normalizeFood(food) }));
  let nextSeed = state.seed;
  const desiredNormals = desiredNormalFoodCount(state.elapsedMs);
  const bomb = nextFoods.find((food) => food.type === "bomb");

  if (bomb) {
    const bombAge = state.elapsedMs - bomb.spawnedAt;
    if (!bomb.reinforcementSpawned && bombAge >= bomb.reinforcementAt) {
      const filled = fillNormalFoods(
        { ...state, seed: nextSeed },
        nextFoods,
        Math.min(3, desiredNormals + 1)
      );
      nextFoods = filled.foods.map((food) =>
        food === bomb ? { ...food, reinforcementSpawned: true } : food
      );
      nextSeed = filled.seed;
      const bombIndex = nextFoods.findIndex((food) => food.type === "bomb");
      if (bombIndex >= 0) {
        nextFoods[bombIndex] = { ...nextFoods[bombIndex], reinforcementSpawned: true };
      }
    }

    if (bombAge >= bomb.expiresAt) {
      nextFoods = nextFoods.filter((food) => food !== bomb);
    }
  } else if (shouldSpawnBomb(state) && nextFoods.filter((food) => food.type === "normal").length > 0) {
    const bombPlacement = spawnFood(
      { ...state, seed: nextSeed },
      {
        type: "bomb",
        spawnedAt: state.elapsedMs,
        expiresAt: BOMB_LIFETIME_MS,
        reinforcementAt: BOMB_REINFORCEMENT_MS,
        reinforcementSpawned: false
      },
      true
    );

    nextSeed = bombPlacement.seed;
    if (bombPlacement.food?.type === "bomb") {
      nextFoods.push(bombPlacement.food);
    }
  }

  const filled = fillNormalFoods(
    { ...state, seed: nextSeed },
    nextFoods,
    desiredNormals
  );

  return {
    ...state,
    foods: filled.foods,
    seed: filled.seed
  };
}

function step(state) {
  const currentFoods = (state.foods ?? (state.food ? [state.food] : [])).map((food) => normalizeFood(food));
  const direction = state.nextDirection || state.direction;
  const head = state.snake[0];
  const nextHead = {
    x: head.x + direction.x,
    y: head.y + direction.y
  };

  if (state.wrap) {
    nextHead.x = (nextHead.x + state.gridSize) % state.gridSize;
    nextHead.y = (nextHead.y + state.gridSize) % state.gridSize;
  } else if (
    nextHead.x < 0 ||
    nextHead.y < 0 ||
    nextHead.x >= state.gridSize ||
    nextHead.y >= state.gridSize
  ) {
    return {
      ...state,
      accumulatorMs: state.accumulatorMs - state.tickMs,
      direction,
      nextDirection: direction,
      status: "gameover"
    };
  }

  const collidedWithWall = state.walls.some((wall) => cellsMatch(wall, nextHead));
  if (collidedWithWall) {
    return {
      ...state,
      accumulatorMs: state.accumulatorMs - state.tickMs,
      direction,
      nextDirection: direction,
      status: "gameover"
    };
  }

  const eatenFood = currentFoods.find((food) => cellsMatch(nextHead, food));
  const foodType = eatenFood?.type ?? "normal";
  const foodEaten = Boolean(eatenFood);
  const ateBomb = foodEaten && foodType === "bomb";
  const nextSnake = [nextHead, ...state.snake];

  if (!foodEaten || ateBomb) {
    nextSnake.pop();
  }

  if (ateBomb) {
    while (nextSnake.length > MIN_SNAKE_LENGTH && nextSnake.length > state.snake.length - BOMB_TAIL_PENALTY) {
      nextSnake.pop();
    }
  }

  const collidedWithBody = nextSnake.slice(1).some((segment) => cellsMatch(segment, nextHead));
  if (collidedWithBody) {
    return {
      ...state,
      accumulatorMs: state.accumulatorMs - state.tickMs,
      direction,
      nextDirection: direction,
      status: "gameover"
    };
  }

  let nextFood = state.food;
  let nextSeed = state.seed;
  let nextStatus = "running";
  let nextScore = state.score;
  let nextFoods = currentFoods.filter((food) => food !== eatenFood);

  if (foodEaten) {
    nextScore += ateBomb ? -BOMB_FOOD_PENALTY : NORMAL_FOOD_SCORE;
  }

  const syncedState = syncFoods({
    ...state,
    snake: nextSnake,
    score: nextScore,
    foods: nextFoods,
    seed: nextSeed
  });
  nextFoods = syncedState.foods;
  nextSeed = syncedState.seed;
  nextFood = nextFoods[0] || null;
  if (nextFoods.length === 0) {
    nextStatus = "won";
  }

  return {
    ...state,
    snake: nextSnake,
    direction,
    nextDirection: direction,
    food: nextFood,
    foods: nextFoods,
    seed: nextSeed,
    score: nextScore,
    status: nextStatus,
    accumulatorMs: state.accumulatorMs - state.tickMs
  };
}
