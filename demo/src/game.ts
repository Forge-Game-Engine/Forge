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
import { KeyboardHoldBinding } from '../../src/input/keyboard/bindings/keyboard-hold-binding';
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
  actionResetTypes.zero,
  defaultInputGroupName,
);
const panInput = new Axis2dAction(
  'pan',
  actionResetTypes.noReset,
  defaultInputGroupName,
);
const fireAction = new TriggerAction('fire', defaultInputGroupName);
const runAction = new HoldAction('run', defaultInputGroupName);

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
