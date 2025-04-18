import { createContainer, Game, ImageCache, RiveCache } from '../../src';
import { createPerlinNoiseScene } from './scenes';

export const game = new Game();

export const gameContainer = createContainer('forge-demo-game');

export const imageCache = new ImageCache();
export const riveCache = new RiveCache();

game.registerScene(
  await createPerlinNoiseScene(game, gameContainer, imageCache),
);

game.run();
