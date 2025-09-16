import {
  actionResetTypes,
  Axis1dAction,
  Axis2dAction,
  buttonMoments,
  createShaderStore,
  createWorld,
  Game,
  HoldAction,
  ImageCache,
  KeyboardHoldBinding,
  KeyboardInputSource,
  KeyboardTriggerBinding,
  keyCodes,
  MouseAxis1dBinding,
  mouseButtons,
  MouseInputSource,
  MouseTriggerBinding,
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

const { inputsManager } = registerInputs(world);

const defaultInputGroupName = 'default';

const zoomInput = new Axis1dAction(
  'zoom',
  defaultInputGroupName,
  actionResetTypes.zero,
);
const panInput = new Axis2dAction(
  'pan',
  defaultInputGroupName,
  actionResetTypes.noReset,
);
const fireAction = new TriggerAction('fire', defaultInputGroupName);
const runAction = new HoldAction('run', defaultInputGroupName);

// TODO: maybe this should be added in the source or binding or
// even during the construction of the manager or
// at least we should be using action type specific methods e.g. `manager.addTriggerAction(fireAction)`?
inputsManager.addResettable(zoomInput);
inputsManager.addResettable(panInput);
inputsManager.addResettable(fireAction);

const cameraEntity = registerCamera(world, {
  zoomInput,
});
const { renderLayers } = registerRendering(game, world);

const keyboardInputSource = new KeyboardInputSource(inputsManager);
const mouseInputSource = new MouseInputSource(inputsManager, game);

inputsManager.setActiveGroup(defaultInputGroupName);

mouseInputSource.triggerBindings.add(
  new MouseTriggerBinding(fireAction, mouseButtons.left, buttonMoments.down),
);

keyboardInputSource.triggerBindings.add(
  new KeyboardTriggerBinding(fireAction, keyCodes.space, buttonMoments.down),
);

mouseInputSource.axis1dBindings.add(new MouseAxis1dBinding(zoomInput));

mouseInputSource.triggerBindings.add(
  new MouseTriggerBinding(fireAction, mouseButtons.left, buttonMoments.down),
);

keyboardInputSource.holdBindings.add(
  new KeyboardHoldBinding(runAction, keyCodes.shiftLeft),
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

world.addSystems(new FireSystem(fireAction, runAction));

zoomInput.valueChangeEvent.registerListener((value) => {
  console.log(value);
});

runAction.holdStartEvent.registerListener(() => {
  console.log('Starting run');
});

runAction.holdEndEvent.registerListener(() => {
  console.log('Ending run');
});

game.run();
