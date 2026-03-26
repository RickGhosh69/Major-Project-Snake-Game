Original prompt: Build a classic Snake game in this repo.

- Repo is a plain HTML/CSS/JS app with an existing canvas-based Snake scaffold.
- Reworking the app to classic-only so the UI and logic stay aligned with the requested scope.
- Plan is to keep rendering on the existing canvas, move rules into a deterministic core module, and expose render_game_to_text plus advanceTime for browser verification.
- Classic-only UI and canvas rendering are now wired through js/snake-core.js plus js/game.js.
- Added built-in Node tests for movement, growth, collisions, and food placement because Playwright is unavailable in the local workspace.
- Added a zero-dependency server.js so the static app has a clean local run command.
- Verification completed with `node js/snake-core.test.js` and a local HTTP smoke check against `http://127.0.0.1:4173`.
- Added an interactive day/night theme toggle with persisted preference and live canvas palette syncing.
- Added Web Audio based sound effects for start, food pickup, game over, and looping background music with a sound toggle.
- Added Classic, Hard, Maze, and Infinite mode selection with deterministic rules and tests for speed, maze walls, and edge wrapping.
