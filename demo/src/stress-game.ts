import {
  AnimationSystem,
  createImageSprite,
  createShaderStore,
  createWorld,
  Game,
  ImageCache,
  Space,
} from '../../src';
import { FPSSystem } from './fps-system';
import { StarSpawnerSystem } from './star-spawner-system';

export const game = new Game();

const imageCache = new ImageCache();
const shaderStore = createShaderStore();
const space = new Space(window.innerWidth, window.innerHeight);

const { world, renderLayers, cameraEntity } = createWorld('world', game, {
  camera: {
    allowPanning: true,
    allowZooming: true,
  },
});

const renderLayer = renderLayers[0];

const image = await imageCache.getOrLoad('star_small.png');
const sprite = createImageSprite(image, renderLayer, shaderStore, cameraEntity);

const fpsDivElement = document.getElementById('fps') as HTMLDivElement;

world.addSystems(
  new StarSpawnerSystem(world, sprite, space, 0, 100),
  new AnimationSystem(world.time),
  new FPSSystem(fpsDivElement, world),
);

game.run();
