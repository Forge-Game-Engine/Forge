import {
  buttonMoments,
  createShaderStore,
  createWorld,
  Game,
  ImageCache,
  KeyboardInputSource,
  keyCodes,
  mouseButtons,
  MouseInputSource,
  registerCamera,
  registerInputs,
  registerRendering,
  TriggerAction,
} from '../../src';
import { KeyboardTriggerBinding } from '../../src/input/bindings';
import { MouseTriggerBinding } from '../../src/input/bindings/mouse-trigger-binding';
import { InputGroup } from '../../src/input/input-group';
import { createBatch } from './create-batch';
import { FireSystem } from './fire-system';

export const game = new Game();

const imageCache = new ImageCache();
const shaderStore = createShaderStore();

const world = createWorld('world', game);

const { inputsManager } = registerInputs(world);
const cameraEntity = registerCamera(world);
const { renderLayers } = registerRendering(game, world);

const fireInput = new TriggerAction('fire');

const keyboardInputSource = new KeyboardInputSource(inputsManager);
const mouseInputSource = new MouseInputSource(inputsManager, game);

const defaultInputGroup = new InputGroup('default');
const alternativeInputGroup = new InputGroup('alternative');

inputsManager.addSource(keyboardInputSource);
inputsManager.addAction(fireInput);
inputsManager.setActiveGroup(defaultInputGroup);

fireInput.bind(
  new KeyboardTriggerBinding(
    { keyCode: keyCodes.f, moment: buttonMoments.down },
    keyboardInputSource,
  ),
  defaultInputGroup,
);

fireInput.bind(
  new KeyboardTriggerBinding(
    { keyCode: keyCodes.space, moment: buttonMoments.down },
    keyboardInputSource,
  ),
  defaultInputGroup,
);

fireInput.bind(
  new KeyboardTriggerBinding(
    { keyCode: keyCodes.space, moment: buttonMoments.up },
    keyboardInputSource,
  ),
  alternativeInputGroup,
);

fireInput.bind(
  new KeyboardTriggerBinding(
    { keyCode: keyCodes.b, moment: buttonMoments.up },
    keyboardInputSource,
  ),
  alternativeInputGroup,
);

fireInput.bind(
  new MouseTriggerBinding(
    { mouseButton: mouseButtons.left, moment: buttonMoments.down },
    mouseInputSource,
  ),
  alternativeInputGroup,
);

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
