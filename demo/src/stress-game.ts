import {
  AnimationSystem,
  createCanvas,
  createImageSprite,
  createShaderStore,
  createWorld,
  Game,
  HtmlForgeRenderLayer,
  HtmlRenderSystem,
  ImageCache,
  RenderSystem,
  Space,
} from '../../src';
import { FPSSystem } from './fps-system';
import { HtmlStarSpawnerSystem } from './html-star-spawner-system';
import { StarSpawnerSystem } from './star-spawner-system';

export const game = new Game();

const imageCache = new ImageCache();
const shaderStore = createShaderStore();
const space = new Space(window.innerWidth, window.innerHeight);

const { world, renderLayers, cameraEntity } = createWorld('world', game, {
  camera: {
    allowPanning: false,
    allowZooming: false,
  },
});

const renderLayer = renderLayers[0];

const image = await imageCache.getOrLoad('star_small.png');

// const sprite = createImageSprite(image, renderLayer, shaderStore, cameraEntity);

const fpsDivElement = document.getElementById('fps') as HTMLDivElement;

const canvas = createCanvas(`html-forge-layer`, game.container);

const htmlRenderLayer = new HtmlForgeRenderLayer('html-render-layer', canvas);

world.addSystems(
  // new StarSpawnerSystem(world, sprite, space, 0, 200),
  new HtmlStarSpawnerSystem(world, image, space, 0, 10),
  new AnimationSystem(world.time),
  new FPSSystem(fpsDivElement, world),
  // new RenderSystem({ layer: renderLayer }),
  new HtmlRenderSystem({ layer: htmlRenderLayer }, cameraEntity),
);

game.run();
