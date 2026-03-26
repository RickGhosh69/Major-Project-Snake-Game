import assert from "node:assert/strict";

import { advanceState, createInitialState, placeFood, queueDirection, DIRECTIONS, MODE_CONFIGS } from "./snake-core.js";

function runningState(overrides = {}) {
  return {
    ...createInitialState({ seed: 11 }),
    status: "running",
    ...overrides
  };
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test("moves one cell per tick in the current direction", () => {
  const state = advanceState(runningState(), 140);

  assert.deepEqual(state.snake[0], { x: 4, y: 10 });
  assert.equal(state.score, 0);
});

test("ignores immediate reverse input", () => {
  const state = queueDirection(runningState(), DIRECTIONS.left);

  assert.equal(state.direction.name, "right");
  assert.equal(state.nextDirection.name, "right");
});

test("accepts one queued turn and ignores a second turn before the next tick", () => {
  let state = runningState();
  state = queueDirection(state, DIRECTIONS.up);
  state = queueDirection(state, DIRECTIONS.left);
  state = advanceState(state, 140);

  assert.deepEqual(state.snake[0], { x: 3, y: 9 });
  assert.equal(state.direction.name, "up");
});

test("grows and scores when food is eaten", () => {
  const state = advanceState(
    runningState({
      snake: [
        { x: 3, y: 10 },
        { x: 2, y: 10 },
        { x: 1, y: 10 }
      ],
      food: { x: 4, y: 10 }
    }),
    140
  );

  assert.equal(state.score, 10);
  assert.equal(state.snake.length, 4);
  assert.deepEqual(state.snake[0], { x: 4, y: 10 });
  assert.notDeepEqual(state.food, { x: 4, y: 10 });
});

test("colliding with a wall ends the game", () => {
  const state = advanceState(
    runningState({
      snake: [
        { x: 19, y: 10 },
        { x: 18, y: 10 },
        { x: 17, y: 10 }
      ]
    }),
    140
  );

  assert.equal(state.status, "gameover");
});

test("colliding with the body ends the game", () => {
  const state = advanceState(
    runningState({
      direction: DIRECTIONS.up,
      nextDirection: DIRECTIONS.up,
      snake: [
        { x: 5, y: 5 },
        { x: 5, y: 6 },
        { x: 4, y: 6 },
        { x: 4, y: 5 },
        { x: 4, y: 4 },
        { x: 5, y: 4 },
        { x: 6, y: 4 },
        { x: 6, y: 5 }
      ]
    }),
    140
  );

  assert.equal(state.status, "gameover");
});

test("food placement never lands on the snake", () => {
  const snake = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 }
  ];
  const placement = placeFood({ snake, gridSize: 5, seed: 3 });

  assert.ok(placement.food);
  assert.equal(snake.some((segment) => segment.x === placement.food.x && segment.y === placement.food.y), false);
});

test("hard mode uses a faster tick interval", () => {
  const state = createInitialState({ mode: "hard", seed: 5 });

  assert.equal(state.tickMs, MODE_CONFIGS.hard.tickMs);
  assert.equal(state.mode, "hard");
});

test("maze mode colliding with an internal wall ends the game", () => {
  const state = advanceState(
    runningState({
      ...createInitialState({ mode: "maze", seed: 5 }),
      status: "running",
      snake: [
        { x: 6, y: 5 },
        { x: 5, y: 5 },
        { x: 4, y: 5 }
      ]
    }),
    MODE_CONFIGS.maze.tickMs
  );

  assert.equal(state.status, "gameover");
});

test("infinite mode wraps across edges", () => {
  const state = advanceState(
    runningState({
      ...createInitialState({ mode: "infinite", seed: 9 }),
      status: "running",
      snake: [
        { x: 19, y: 10 },
        { x: 18, y: 10 },
        { x: 17, y: 10 }
      ]
    }),
    MODE_CONFIGS.infinite.tickMs
  );

  assert.equal(state.status, "running");
  assert.deepEqual(state.snake[0], { x: 0, y: 10 });
});

let failures = 0;

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}

if (failures > 0) {
  process.exit(1);
}

console.log(`Completed ${tests.length} snake core tests.`);
