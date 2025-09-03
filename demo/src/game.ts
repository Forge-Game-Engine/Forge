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
  KeyboardAxis1dInteraction,
  KeyboardHoldInteraction,
  KeyboardInputSource,
  KeyboardTriggerInteraction,
  keyCodes,
  MouseAxis1dInteraction,
  MouseAxis2dInteraction,
  mouseButtons,
  MouseInputSource,
  MouseTriggerInteraction,
  registerCamera,
  registerInputs,
  registerRendering,
  TriggerAction,
} from '../../src';
import { HoldAction } from '../../src/input/actions/hold-action';
import { KeyboardAxis1dInputSource } from '../../src/input/input-sources/keyboard-axis1d-input-source';
import { createBatch } from './create-batch';
import { FireSystem } from './fire-system';

export const game = new Game();

const imageCache = new ImageCache();
const shaderStore = createShaderStore();

const world = createWorld('world', game);

const zoomInput = new Axis1dAction('zoom');
const panInput = new Axis2dAction('pan', actionResetTypes.noReset);
const fireInput = new TriggerAction('fire');
const runInput = new HoldAction('run');
const axisInput = new Axis1dAction('axis');

const { inputsManager } = registerInputs(world);
const cameraEntity = registerCamera(world, {
  zoomInput,
});
const { renderLayers } = registerRendering(game, world);

const keyboardInputSource = new KeyboardInputSource(inputsManager);
const mouseInputSource = new MouseInputSource(inputsManager, game);

const keyboardAxis1dInputSource = new KeyboardAxis1dInputSource(
  inputsManager,
  keyCodes.m,
  keyCodes.n,
);

const defaultInputGroup = new InputGroup('default');
const alternativeInputGroup = new InputGroup('alternative');

inputsManager.addSources(
  keyboardInputSource,
  mouseInputSource,
  keyboardAxis1dInputSource,
);
inputsManager.addActions(fireInput, zoomInput, panInput, runInput, axisInput);
inputsManager.setActiveGroup(defaultInputGroup);

keyboardAxis1dInputSource.bindAxis1d(axisInput, {
  negativeKey: keyCodes.m,
  positiveKey: keyCodes.n,
});

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

runInput.bind(
  new KeyboardHoldInteraction({ keyCode: keyCodes.k }, keyboardInputSource),
  defaultInputGroup,
);

axisInput.bind(
  new KeyboardAxis1dInteraction(
    keyboardAxis1dInputSource,
    keyCodes.m,
    keyCodes.n,
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
