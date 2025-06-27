import {
  createImageSprite,
  createShaderStore,
  createWorld,
  Game,
  ImageCache,
  PositionComponent,
  SpriteComponent,
} from '../../src';

export const game = new Game();

const imageCache = new ImageCache();
const shaderStore = createShaderStore();

const { world, renderLayers } = createWorld('world', game);

const image = await imageCache.getOrLoad('ship.png');

const sprite = createImageSprite(image, renderLayers[0], shaderStore);

world.buildAndAddEntity('sprite', [
  new PositionComponent(),
  new SpriteComponent(sprite),
]);

game.run();
