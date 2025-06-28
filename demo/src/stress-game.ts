import {
  AnimationComponent,
  AnimationSystem,
  CameraComponent,
  createImageSprite,
  createShaderStore,
  createWorld,
  degreesToRadians,
  Game,
  ImageCache,
  PositionComponent,
  Random,
  RotationComponent,
  ScaleComponent,
  Space,
  SpriteComponent,
} from '../../src';

export const game = new Game();

const numberOfStars = 50_000;

const imageCache = new ImageCache();
const shaderStore = createShaderStore();
const space = new Space(1500, 1500);
const random = new Random('game');

const { world, renderLayers, cameraEntity } = createWorld('world', game, {
  camera: {
    allowPanning: true,
    allowZooming: true,
  },
});

const renderLayer = renderLayers[0];

const image = await imageCache.getOrLoad('star_small.png');
const sprite = createImageSprite(image, renderLayer, shaderStore, cameraEntity);

for (let i = 0; i < numberOfStars; i++) {
  const scale = random.randomFloat(0.1, 0.5);
  const rotation = new RotationComponent(0);

  world.buildAndAddEntity(`star-${i}`, [
    new PositionComponent(
      random.randomInt(-space.width / 2, space.width / 2),
      random.randomInt(-space.height / 2, space.height / 2),
    ),
    new SpriteComponent(sprite),
    new ScaleComponent(scale, scale),
    rotation,
    new AnimationComponent({
      duration: 5000,
      loop: 'pingpong',
      updateCallback: (t) => {
        rotation.radians = degreesToRadians(180) * t;
      },
    }),
  ]);
}

world.addSystem(new AnimationSystem(world.time));

game.run();
