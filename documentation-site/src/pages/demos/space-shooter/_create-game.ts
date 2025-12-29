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
  createSprite,
  RenderLayerComponent,
  RenderSystem,
  SpriteComponent,
} from '@forge-game-engine/forge/rendering';
import { getImageUrl } from '@site/src/utils/get-image-url';
import { createGame } from '@forge-game-engine/forge/utilities';
import { PlayerComponent } from './_player.component';
import { MovementSystem } from './_movement.system';
import { createBackgroundMaterial } from './_create-background-material';
import { BackgroundComponent } from './_background.component';
import { BackgroundSystem } from './_background.system';
import {
  ParticleEmitter,
  ParticleEmitterComponent,
  ParticleEmitterSystem,
  ParticlePositionSystem,
} from '@forge-game-engine/forge/particles';

export const createSpaceShooterGame = async (): Promise<Game> => {
  const { game, world, renderContext } = createGame('demo-game');

  const moveInput = new Axis2dAction('move', null, actionResetTypes.noReset);
  const shootInput = new HoldAction('shoot');

  const { inputsManager } = registerInputs(world, {
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

  const cameraEntity = registerCamera(world);

  const playerSprite = await createImageSprite(
    getImageUrl('space-shooter/ship_G.png'),
    renderContext,
    cameraEntity,
  );

  playerSprite.tintColor = new Color(0, 0.7, 1);

  const playerEntity = world.buildAndAddEntity([
    new SpriteComponent(playerSprite),
    new PositionComponent(0, 250),
    new PlayerComponent(50, -300, 300, -100, 270),
  ]);

  const renderLayerComponent = new RenderLayerComponent();
  world.buildAndAddEntity([renderLayerComponent]);

  const backgroundMaterial = createBackgroundMaterial(renderContext);

  const backgroundSprite = createSprite(
    backgroundMaterial,
    renderContext,
    cameraEntity,
    renderContext.canvas.width,
    renderContext.canvas.height,
  );

  const bgEntity = world.buildAndAddEntity([
    new SpriteComponent(backgroundSprite),
    new PositionComponent(0, 0),
    new BackgroundComponent(),
  ]);

  const smallStarSprite = await createImageSprite(
    getImageUrl('space-shooter/star_small.png'),
    renderContext,
    cameraEntity,
  );

  const emitter = new ParticleEmitter(smallStarSprite, renderLayerComponent, {
    emitDurationSeconds: 10,
    lifetimeSecondsRange: { min: 5, max: 10 },
  });

  const emitterComponent = new ParticleEmitterComponent(
    new Map([['testEmitter', emitter]]),
  );

  world.buildAndAddEntity([emitterComponent]);

  renderLayerComponent.addEntity(backgroundSprite.renderable, bgEntity);
  renderLayerComponent.addEntity(playerSprite.renderable, playerEntity);

  world.addSystem(new RenderSystem(renderContext));
  world.addSystem(new MovementSystem(moveInput, world.time));
  world.addSystem(new BackgroundSystem(world.time));
  world.addSystem(new ParticleEmitterSystem(world));
  world.addSystem(new ParticlePositionSystem(world.time));

  return game;
};
