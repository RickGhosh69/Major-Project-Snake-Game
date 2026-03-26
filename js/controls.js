export const Controls = {
  init(game) {
    this.game = game;

    window.addEventListener("keydown", e => {
      const k = e.key.toLowerCase();

      const dir = {
        "arrowup": { x: 0, y: -1 }, "w": { x: 0, y: -1 },
        "arrowdown": { x: 0, y: 1 }, "s": { x: 0, y: 1 },
        "arrowleft": { x: -1, y: 0 }, "a": { x: -1, y: 0 },
        "arrowright": { x: 1, y: 0 }, "d": { x: 1, y: 0 },
      };

      if (dir[k]) this.game.setDirection(dir[k]);
    });
  },

  touchDirection(game, d) {
    game.setDirection(d);
  }
};
