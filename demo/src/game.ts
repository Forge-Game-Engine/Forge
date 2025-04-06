import { createContainer, Game, ImageCache, RiveCache } from '../../src';
import { createTitleScene } from './scenes';

export const game = new Game();

export const gameContainer = createContainer('forge-demo-game');

export const imageCache = new ImageCache();
export const riveCache = new RiveCache();

game.registerScene(
  await createTitleScene(game, gameContainer, riveCache, game.time),
);

game.run();
