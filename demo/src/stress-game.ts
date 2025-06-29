import {
  AnimationSystem,
  createCanvas,
  createShaderStore,
  createWorld,
  Game,
  HtmlForgeRenderLayer,
  HtmlRenderSystem,
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

const fpsDivElement = document.getElementById('fps') as HTMLDivElement;

const canvas = createCanvas(`html-forge-layer`, game.container);

const htmlRenderLayer = new HtmlForgeRenderLayer('html-render-layer', canvas);

world.addSystems(
  new StarSpawnerSystem(world, image, space, 0, 20),
  new AnimationSystem(world.time),
  new FPSSystem(fpsDivElement, world),
  new HtmlRenderSystem({ layer: htmlRenderLayer }, cameraEntity),
);

game.run();
