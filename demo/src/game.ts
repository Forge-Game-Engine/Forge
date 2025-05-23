import {
  createContainer,
  createShaderStore,
  Game,
  ImageCache,
  RiveCache,
} from '../../src';
import { createShipPilotScene } from './scenes';

export const game = new Game();

export const gameContainer = createContainer('forge-demo-game');

export const imageCache = new ImageCache();
export const riveCache = new RiveCache();
export const shaderStore = createShaderStore();

game.registerScene(
  await createShipPilotScene(game, gameContainer, imageCache, shaderStore),
);

game.run();
