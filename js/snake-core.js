const DEFAULT_GRID_SIZE = 20;
const DEFAULT_TICK_MS = 140;

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
  const walls = [];
  const columnA = Math.max(4, Math.floor(gridSize * 0.35));
  const columnB = Math.min(gridSize - 5, Math.floor(gridSize * 0.65));
  const gapTop = 4;
  const gapMidStart = Math.floor(gridSize * 0.45);
  const gapMidEnd = gapMidStart + 2;
  const gapBottom = gridSize - 5;

  for (let y = 2; y < gridSize - 2; y += 1) {
    if (y !== gapTop && y !== gapMidStart && y !== gapMidEnd) {
      walls.push({ x: columnA, y });
    }

    if (y !== gapMidStart - 1 && y !== gapBottom && y !== gapBottom - 1) {
      walls.push({ x: columnB, y });
    }
  }

  return walls;
}

function getModeConfig(mode) {
  return MODE_CONFIGS[mode] || MODE_CONFIGS.classic;
}

export function createInitialState({ gridSize = DEFAULT_GRID_SIZE, tickMs = DEFAULT_TICK_MS, seed = 1, mode = "classic" } = {}) {
  const config = getModeConfig(mode);
  const snake = [
    { x: 3, y: 10 },
    { x: 2, y: 10 },
    { x: 1, y: 10 }
  ];
  const walls = config.maze ? createMazeWalls(gridSize) : [];
  const foodPlacement = placeFood({ snake, walls, gridSize, seed: seed >>> 0 });

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

export function placeFood({ snake, gridSize, seed }) {
  const totalCells = gridSize * gridSize;
  const walls = arguments[0].walls || [];
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
    walls.some((wall) => cellsMatch(wall, candidate))
  );

  return {
    seed: currentSeed,
    food: candidate
  };
}

function step(state) {
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

  const foodEaten = state.food && cellsMatch(nextHead, state.food);
  const nextSnake = [nextHead, ...state.snake];

  if (!foodEaten) {
    nextSnake.pop();
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

  if (foodEaten) {
    nextScore += 10;
    const placement = placeFood({
      snake: nextSnake,
      walls: state.walls,
      gridSize: state.gridSize,
      seed: state.seed
    });
    nextFood = placement.food;
    nextSeed = placement.seed;
    if (!nextFood) {
      nextStatus = "won";
    }
  }

  return {
    ...state,
    snake: nextSnake,
    direction,
    nextDirection: direction,
    food: nextFood,
    seed: nextSeed,
    score: nextScore,
    status: nextStatus,
    accumulatorMs: state.accumulatorMs - state.tickMs
  };
}
