import {
  buttonMoments,
  createShaderStore,
  createWorld,
  Game,
  ImageCache,
  KeyboardInputSource,
  KeyboardTriggerActionInputBinding,
  keyCodes,
  registerCamera,
  registerInputs,
  registerRendering,
  TriggerAction,
} from '../../src';
import { InputGroup } from '../../src/input/input-group';
import { createBatch } from './create-batch';
import { FireSystem } from './fire-system';

export const game = new Game();

const imageCache = new ImageCache();
const shaderStore = createShaderStore();

const fireInput = new TriggerAction('fire');

const { world, renderLayers, cameraEntity, inputsManager } = await createWorld(
  'world',
  game,
)
  .add(registerInputs())
  .add(registerCamera())
  .add(registerRendering())
  .execute();

const keyboardInputSource = new KeyboardInputSource(inputsManager);

const defaultInputGroup = new InputGroup('default');
const alternativeInputGroup = new InputGroup('alternative');

inputsManager.addSource(keyboardInputSource);
inputsManager.addAction(fireInput);
inputsManager.setActiveGroup(defaultInputGroup);

defaultInputGroup.bindTriggerAction(
  new KeyboardTriggerActionInputBinding(
    fireInput,
    { keyCode: keyCodes.f, moment: buttonMoments.down },
    keyboardInputSource,
  ),
);

defaultInputGroup.bindTriggerAction(
  new KeyboardTriggerActionInputBinding(
    fireInput,
    { keyCode: keyCodes.space, moment: buttonMoments.up },
    keyboardInputSource,
  ),
);

alternativeInputGroup.bindTriggerAction(
  new KeyboardTriggerActionInputBinding(
    fireInput,
    { keyCode: keyCodes.space, moment: buttonMoments.up },
    keyboardInputSource,
  ),
);

alternativeInputGroup.bindTriggerAction(
  new KeyboardTriggerActionInputBinding(
    fireInput,
    { keyCode: keyCodes.b, moment: buttonMoments.up },
    keyboardInputSource,
  ),
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
