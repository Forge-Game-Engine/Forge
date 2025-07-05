import {
  createImageSprite,
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
  PositionComponent,
  registerCamera,
  registerInputs,
  registerRendering,
  SpriteComponent,
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

const image = await imageCache.getOrLoad('ship.png');

const sprite = createImageSprite(image, renderLayers[0], shaderStore);

world.buildAndAddEntity('sprite', [
  new PositionComponent(),
  new SpriteComponent(sprite),
]);

world.addSystems(new FireSystem());

game.run();
