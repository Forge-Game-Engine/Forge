import { createShaderStore, createWorld, Game, ImageCache } from '../../src';
import { createBatch } from './create-batch';

export const game = new Game();

const imageCache = new ImageCache();
const shaderStore = createShaderStore();

const { world, renderLayers, cameraEntity } = createWorld('world', game);

const sprites = [
  'star_medium.png',
  'star_small.png',
  'star_large.png',
  'ship.png',
  'meteor_detailedLarge.png',
];

for (const sprite of sprites) {
  await createBatch(
    sprite,
    imageCache,
    world,
    renderLayers[0],
    shaderStore,
    cameraEntity,
    10_000,
  );
}

game.run();
