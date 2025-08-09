import {
  actionResetTypes,
  Axis1dAction,
  Axis2dAction,
  buttonMoments,
  createShaderStore,
  createWorld,
  Game,
  ImageCache,
  InputGroup,
  KeyboardInputSource,
  KeyboardTriggerInteraction,
  keyCodes,
  MouseAxis1dInteraction,
  MouseAxis2dInteraction,
  mouseButtons,
  MouseInputSource,
  MouseTriggerInteraction,
  registerAnimationSetManager,
  registerCamera,
  registerInputs,
  registerRendering,
  TriggerAction,
} from '../../src';
import { createBatch } from './create-batch';
import { FireSystem } from './fire-system';

export const game = new Game();

const imageCache = new ImageCache();
const shaderStore = createShaderStore();

const world = createWorld('world', game);

const zoomInput = new Axis1dAction('zoom');
const panInput = new Axis2dAction('pan', actionResetTypes.noReset);
const fireInput = new TriggerAction('fire');

const { inputsManager } = registerInputs(world);
const cameraEntity = registerCamera(world, {
  zoomInput,
});
const animationSetManager = registerAnimationSetManager();
const { renderLayers } = registerRendering(game, world, animationSetManager);

const keyboardInputSource = new KeyboardInputSource(inputsManager);
const mouseInputSource = new MouseInputSource(inputsManager, game);

const defaultInputGroup = new InputGroup('default');
const alternativeInputGroup = new InputGroup('alternative');

inputsManager.addSources(keyboardInputSource, mouseInputSource);
inputsManager.addActions(fireInput, zoomInput, panInput);
inputsManager.setActiveGroup(defaultInputGroup);

fireInput.bind(
  new KeyboardTriggerInteraction(
    { keyCode: keyCodes.f, moment: buttonMoments.down },
    keyboardInputSource,
  ),
  defaultInputGroup,
);

fireInput.bind(
  new KeyboardTriggerInteraction(
    { keyCode: keyCodes.space, moment: buttonMoments.down },
    keyboardInputSource,
  ),
  defaultInputGroup,
);

fireInput.bind(
  new KeyboardTriggerInteraction(
    { keyCode: keyCodes.space, moment: buttonMoments.up },
    keyboardInputSource,
  ),
  alternativeInputGroup,
);

fireInput.bind(
  new KeyboardTriggerInteraction(
    { keyCode: keyCodes.b, moment: buttonMoments.up },
    keyboardInputSource,
  ),
  alternativeInputGroup,
);

fireInput.bind(
  new MouseTriggerInteraction(
    { mouseButton: mouseButtons.left, moment: buttonMoments.down },
    mouseInputSource,
  ),
  alternativeInputGroup,
);

zoomInput.bind(
  new MouseAxis1dInteraction(mouseInputSource),
  alternativeInputGroup,
);

panInput.bind(
  new MouseAxis2dInteraction(mouseInputSource),
  alternativeInputGroup,
);

// inputsManager.bindOnNextAxis1dAction(zoomInput);

inputsManager.setActiveGroup(alternativeInputGroup);

const sprites = [
  'star_medium.png',
  'star_small.png',
  'star_large.png',
  'ship.png',
  'meteor_detailedLarge.png',
];

const batchPromises = sprites.map((sprite) =>
  createBatch(
    sprite,
    imageCache,
    world,
    renderLayers[0],
    shaderStore,
    cameraEntity,
    10_000,
  ),
);

await Promise.all(batchPromises);

world.addSystems(new FireSystem());

game.run();
