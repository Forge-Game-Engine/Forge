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

const gameInputGroup = 'game';

const zoomInput = new Axis1dAction(
  'zoom',
  gameInputGroup,
  actionResetTypes.zero,
);
const panInput = new Axis2dAction(
  'pan',
  gameInputGroup,
  actionResetTypes.noReset,
);
const fireAction = new TriggerAction('fire', gameInputGroup);
const runAction = new HoldAction('run', gameInputGroup);

const { inputsManager } = registerInputs(world, {
  triggerActions: [fireAction],
  axis1dActions: [zoomInput],
  axis2dActions: [panInput],
});

const cameraEntity = registerCamera(world, {
  zoomInput,
});
const { renderLayers } = registerRendering(game, world);

const keyboardInputSource = new KeyboardInputSource(inputsManager);
const mouseInputSource = new MouseInputSource(inputsManager, game);

inputsManager.setActiveGroup(gameInputGroup);

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
