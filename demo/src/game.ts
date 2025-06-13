import {
  addForgeRenderLayers,
  createImageSprite,
  createScene,
  createShaderStore,
  DEFAULT_LAYERS,
  Game,
  ImageCache,
  PositionComponent,
  SpriteComponent,
} from '../../src';

export const game = new Game();

const imageCache = new ImageCache();
const shaderStore = createShaderStore();

const { world, scene, layerService, cameraEntity } = createScene('game', game);

game.registerScene(scene);

const [foregroundRenderLayer] = addForgeRenderLayers(
  [DEFAULT_LAYERS.foreground],
  game.container,
  layerService,
  world,
  cameraEntity,
);

const image = await imageCache.getOrLoad('ship.png');

const sprite = createImageSprite(
  image,
  foregroundRenderLayer.layer,
  shaderStore,
);

world.buildAndAddEntity('sprite', [
  new PositionComponent(),
  new SpriteComponent(sprite),
]);

game.run();
