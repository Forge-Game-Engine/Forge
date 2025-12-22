import {
  Axis1dAction,
  createImageSprite,
  createWorld,
  Game,
  MouseInputSource,
  registerCamera,
  registerInputs,
  registerRendering,
  SpriteAnimationSystem,
} from '../../src';
import { createRenderContext } from '../../src/rendering/render-context';
import { setupAnimationsDemo } from './animationDemo';
import { ControlAdventurerSystem } from './control-adventurer-system';

export const game = new Game(document.getElementById('demo-container')!);

const renderContext = createRenderContext();

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

const shipSprite = await createImageSprite(
  'ship_spritesheet.png',
  renderLayers[0],
  renderContext,
  cameraEntity,
);

const adventurerSprite = await createImageSprite(
  'adventurer_spritesheet.png',
  renderLayers[0],
  renderContext,
  cameraEntity,
);

const { attackInput, runRInput, runLInput, jumpInput, takeDamageInput } =
  setupAnimationsDemo(world, game, shipSprite, adventurerSprite);

world.addSystem(new SpriteAnimationSystem(world.time));
world.addSystem(
  new ControlAdventurerSystem(
    attackInput,
    runRInput,
    runLInput,
    jumpInput,
    takeDamageInput,
  ),
);

game.run();
