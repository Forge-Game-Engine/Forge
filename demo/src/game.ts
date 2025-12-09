import {
  Axis1dAction,
  createImageSprite,
  createShaderStore,
  createWorld,
  Game,
  ImageCache,
  MouseInputSource,
  registerCamera,
  registerInputs,
  registerRendering,
  SpriteAnimationSystem,
} from '../../src';
import { setupAnimationsDemo } from './animationDemo';

export const game = new Game(document.getElementById('demo-container')!);

const imageCache = new ImageCache();
const shaderStore = createShaderStore();

const world = createWorld('world', game);

const zoomInput = new Axis1dAction('zoom', 'game');

const { inputsManager } = registerInputs(world, {
  axis1dActions: [zoomInput],
});

const mouseInputSource = new MouseInputSource(inputsManager, game);

mouseInputSource.axis1dBindings.add({
  action: zoomInput,
  displayText: 'Zoom',
});

const cameraEntity = registerCamera(world, {
  zoomInput,
});
const { renderLayers } = registerRendering(game, world);

const shipImage = await imageCache.getOrLoad('ship_spritesheet.png');
const adventurerImage = await imageCache.getOrLoad(
  'adventurer_spritesheet.png',
);

const shipSprite = createImageSprite(
  shipImage,
  renderLayers[0],
  shaderStore,
  cameraEntity,
);

const adventurerSprite = createImageSprite(
  adventurerImage,
  renderLayers[0],
  shaderStore,
  cameraEntity,
);

setupAnimationsDemo(world, game, shipSprite, adventurerSprite);

world.addSystem(new SpriteAnimationSystem(world.time));

game.run();
