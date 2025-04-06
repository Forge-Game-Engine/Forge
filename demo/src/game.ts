import { createContainer, Game, ImageCache, RiveCache } from '../../src';
import { createTitleScene } from './scenes';
import { createPerlinNoiseScene } from './scenes/perlin-noise';

export const game = new Game();

export const gameContainer = createContainer('forge-demo-game');

export const imageCache = new ImageCache();
export const riveCache = new RiveCache();

game.registerScene(
  await createPerlinNoiseScene(game, gameContainer, game.time),
);

game.run();
