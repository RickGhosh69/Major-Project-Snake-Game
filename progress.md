Original prompt: Build a classic Snake game in this repo.

- Repo is a plain HTML/CSS/JS app with an existing canvas-based Snake scaffold.
- Reworking the app to classic-only so the UI and logic stay aligned with the requested scope.
- Plan is to keep rendering on the existing canvas, move rules into a deterministic core module, and expose render_game_to_text plus advanceTime for browser verification.
- Classic-only UI and canvas rendering are now wired through js/snake-core.js plus js/game.js.
- Added built-in Node tests for movement, growth, collisions, and food placement because Playwright is unavailable in the local workspace.
- Added a zero-dependency server.js so the static app has a clean local run command.
- Verification completed with `node js/snake-core.test.js` and a local HTTP smoke check against `http://127.0.0.1:5500`.
- Added an interactive day/night theme toggle with persisted preference and live canvas palette syncing.
- Added Web Audio based sound effects for start, food pickup, game over, and looping background music with a sound toggle.
- Added Classic, Hard, Maze, and Infinite mode selection with deterministic rules and tests for speed, maze walls, and edge wrapping.
- Reworked the art direction toward a soft arcade look: aqua water board, diagonal texture, bubbly highlights, glossy bead snake segments, a cartoon head, candy food, and coral-style maze pillars inspired by the provided reference.
- Dark mode now carries through the full atmosphere with a properly darker page, panels, and board treatment instead of just a mild tint shift.
- Simplified the arena decoration so only real maze blocks read as hazards, while non-collidable details stay subtle and corner-bound.
- Rebuilt maze mode with scattered obstacle clusters and a protected spawn lane so the player does not crash immediately on start.
- Added late-run bomb food: normal fruit now gives 1 point, bombs cost 3 points and remove up to 3 tail segments, and core tests cover the new behavior.
- Switched the theme toggle to pointer-based handling and mobile-safe sizing so the day/night switch remains usable on touch screens.
- Reworked food flow so bombs no longer replace all safe food: fruit count ramps up over time, bombs flicker late in their lifetime, reinforce the board with another normal fruit before vanishing, and then expire cleanly.
- Added another small art pass to the board with stronger day/night atmosphere and a little more life without reintroducing confusing fake hazards.
