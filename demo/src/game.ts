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
  ScaleComponent,
  SpriteComponent,
} from '../../src';

export const game = new Game();

const imageCache = new ImageCache();
const shaderStore = createShaderStore();

const { world, renderLayers, cameraEntity } = createWorld('world', game);

const animationSpriteSheet = await imageCache.getOrLoad('ship_spritesheet.png');

const animationCreator = new AnimationCreator();
const frameGemoetry = animationCreator.createAnimation(renderLayers[0], 6, 6); // can be used for any 6x6 sprite sheet on renderLayers[0]

const sprite = createImageSprite(
  animationSpriteSheet,
  renderLayers[0],
  shaderStore,
  cameraEntity,
);

for (let i = 0; i < 10000; i++) {
  createShip();
}
world.addSystems(new ImageAnimationSystem(world.time));

game.run();
function createShip() {
  world.buildAndAddEntity('ship-animation', [
    new PositionComponent(500 - Math.random() * 1000, 500 -Math.random() * 1000),
    new SpriteComponent(sprite),
    new ScaleComponent(0.5, 0.5),
    new ImageAnimationComponent({
      frameGeometry: frameGemoetry,
      animationDurationSeconds: 1,
      repeating: true,
    }),
  ]);
}
