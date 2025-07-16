import {
  AnimationCreator,
  createImageSprite,
  createShaderStore,
  createWorld,
  Game,
  ImageAnimationComponent,
  ImageAnimationSystem,
  ImageCache,
  PositionComponent,
  SpriteComponent,
} from '../../src';

export const game = new Game();

const imageCache = new ImageCache();
const shaderStore = createShaderStore();

const { world, renderLayers, cameraEntity } = createWorld('world', game);

const animationSpriteSheet = await imageCache.getOrLoad('ship_spritesheet.png');

const animationCreator = new AnimationCreator(
  renderLayers[0],
  shaderStore,
  cameraEntity,
);
const frames = animationCreator.createAnimation(animationSpriteSheet, 6, 6);

const sprite = createImageSprite(
  animationSpriteSheet,
  renderLayers[0],
  shaderStore,
  cameraEntity,
);

world.buildAndAddEntity('shipanimation', [
  new PositionComponent(),
  new SpriteComponent(sprite),
  new ImageAnimationComponent({
    frames: frames,
    animationDurationSeconds: 1,
    repeating: true,
  }),
]);

world.addSystems(new ImageAnimationSystem(world.time));

game.run();
