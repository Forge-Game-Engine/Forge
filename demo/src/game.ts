import {
  actionResetTypes,
  Axis1dAction,
  Axis2dAction,
  buttonMoments,
  createImageSprite,
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
  registerCamera,
  registerInputs,
  registerRendering,
  TriggerAction,
} from '../../src';
import { CircleMotionSystem } from './circle-motion-system';
import { FireSystem } from './fire-system';
import { SoakTestComponent } from './soak-test-component';
import { SoakTestSystem } from './soak-test-system';

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
const { renderLayers } = registerRendering(game, world);

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

const soakTestImage = await imageCache.getOrLoad('star_small.png');
const soakTestSprite = createImageSprite(
  soakTestImage,
  renderLayers[0],
  shaderStore,
  cameraEntity,
);

world.buildAndAddEntity('soak-test', [new SoakTestComponent()]);

world.addSystems(
  new FireSystem(),
  new CircleMotionSystem(world),
  new SoakTestSystem({ world, sprite: soakTestSprite }),
);

game.run();
