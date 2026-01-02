import { PositionComponent } from '@forge-game-engine/forge/common';
import {
  Game,
  registerCamera,
  registerInputs,
} from '@forge-game-engine/forge/ecs';
import {
  actionResetTypes,
  Axis2dAction,
  HoldAction,
  KeyboardAxis2dBinding,
  KeyboardHoldBinding,
  KeyboardInputSource,
  keyCodes,
} from '@forge-game-engine/forge/input';
import {
  Color,
  createImageSprite,
  RenderLayer,
  RenderLayerComponent,
  RenderSystem,
  SpriteComponent,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { createGame } from '@forge-game-engine/forge/utilities';
import { PlayerComponent } from './_player.component';
import { MovementSystem } from './_movement.system';
import { createBackground } from './_create-background';
import { BackgroundSystem } from './_background.system';
import {
  ParticleEmitterSystem,
  ParticlePositionSystem,
} from '@forge-game-engine/forge/particles';
import { AudioSystem } from '@forge-game-engine/forge/audio';
import { createMusic } from './_create-music';

export const createSpaceShooterGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  const renderLayer = new RenderLayer();

  const moveInput = new Axis2dAction('move', null, actionResetTypes.noReset);
  const shootInput = new HoldAction('shoot');

  const { inputsManager } = registerInputs(world, time, {
    axis2dActions: [moveInput],
    holdActions: [shootInput],
  });

  const keyboardInputSource = new KeyboardInputSource(inputsManager);

  keyboardInputSource.axis2dBindings.add(
    new KeyboardAxis2dBinding(
      moveInput,
      keyCodes.w,
      keyCodes.s,
      keyCodes.d,
      keyCodes.a,
    ),
  );

  keyboardInputSource.holdBindings.add(
    new KeyboardHoldBinding(shootInput, keyCodes.space),
  );

  const cameraEntity = registerCamera(world, time);

  const playerSprite = await createImageSprite(
    getAssetUrl('img/space-shooter/ship_G.png'),
    renderContext,
    cameraEntity,
  );

  playerSprite.tintColor = new Color(0.6, 1, 0.6);

  const playerEntity = world.buildAndAddEntity([
    new SpriteComponent(playerSprite),
    new PositionComponent(0, 250),
    new PlayerComponent(50, -300, 300, -100, 270),
  ]);

  world.buildAndAddEntity([new RenderLayerComponent(renderLayer)]);

  await createBackground(world, cameraEntity, renderLayer, renderContext);
  createMusic(world);

  renderLayer.addEntity(playerSprite.renderable, playerEntity);

  world.addSystem(new RenderSystem(renderContext));
  world.addSystem(new MovementSystem(moveInput, time));
  world.addSystem(new BackgroundSystem(time));
  world.addSystem(new ParticleEmitterSystem(world, time));
  world.addSystem(new ParticlePositionSystem(time));
  world.addSystem(new AudioSystem(world));

  return game;
};
