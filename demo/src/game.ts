import {
  Axis1dAction,
  createShaderStore,
  createWorld,
  Game,
  ImageCache,
  MouseInputSource,
  registerCamera,
  registerInputs,
  registerRendering,
} from '../../src';
import { createBatch } from './create-batch';

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

await createBatch(
  'blue-circle.png',
  imageCache,
  world,
  renderLayers[0],
  shaderStore,
  cameraEntity,
  40_000,
);

game.run();
