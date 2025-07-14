import {
  createShaderStore,
  createWorld,
  Game,
  ImageCache,
  InputAction,
  InputAxis1d,
  InputsComponent,
  KeyboardInputSource,
  keyCodes,
  mouseButtons,
  MouseInputSource,
  registerCamera,
  registerInputs,
  registerRendering,
} from '../../src';
import { FireSystem } from './fire-system';

export const game = new Game();

const imageCache = new ImageCache();
const shaderStore = createShaderStore();

const fireInput = new InputAction('fire');
const zoomInput = new InputAxis1d('zoom');

const { world, renderLayers, inputsEntity } = await createWorld('world', game)
  .add(registerInputs())
  .add(
    registerCamera({
      zoomInput,
    }),
  )
  .add(registerRendering())
  .execute();

const inputsComponent = inputsEntity.getComponentRequired<InputsComponent>(
  InputsComponent.symbol,
);

const mouseInputSource = new MouseInputSource(game);
const keyboardInputSource = new KeyboardInputSource();

inputsComponent.inputSources.add(mouseInputSource);
inputsComponent.inputSources.add(keyboardInputSource);

mouseInputSource.bindAction(fireInput, {
  moment: 'down',
  mouseButton: mouseButtons.left,
});

mouseInputSource.bindAxis1d(zoomInput);

keyboardInputSource.bindAction(fireInput, {
  moment: 'down',
  keyCode: keyCodes.f,
});

inputsComponent.inputActions.set(fireInput.name, fireInput);
inputsComponent.inputAxis1ds.set(zoomInput.name, zoomInput);

const sprites = [
  'star_medium.png',
  'star_small.png',
  'star_large.png',
  'ship.png',
  'meteor_detailedLarge.png',
];

for (const sprite of sprites) {
  await createBatch(
    sprite,
    imageCache,
    world,
    renderLayers[0],
    shaderStore,
    cameraEntity,
    10_000,
  );
}

world.addSystems(new FireSystem());

game.run();
