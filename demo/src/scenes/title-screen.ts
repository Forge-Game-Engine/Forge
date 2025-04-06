import { Alignment, Fit, Layout, RiveEventPayload } from '@rive-app/webgl2';
import * as forge from '../../../src';
import { createStarfield } from '../create-starfield';
import { createPerlinNoiseScene } from './perlin-noise';

const riveFileUri = 'ui.riv';
const riveStateMachine = 'Button';
const riveStartOnClickedEventName = 'OnClick';

export async function createTitleScene(
  game: forge.Game,
  gameContainer: HTMLElement,
  riveCache: forge.RiveCache,
  time: forge.Time,
) {
  const scene = new forge.Scene('title-screen');

  const worldSpace = new forge.Space(window.innerWidth, window.innerHeight);
  const layerService = new forge.LayerService();

  window.addEventListener('resize', () => {
    layerService.resizeAllLayers();
  });

  const world = new forge.World();

  const inputsEntity = new forge.Entity('inputs', [
    new forge.InputsComponent(),
  ]);

  const inputSystem = new forge.InputSystem(gameContainer);

  world.addEntity(inputsEntity);
  world.addSystem(inputSystem);

  const cameraEntity = new forge.Entity('world camera', [
    new forge.CameraComponent({ allowZooming: false, allowPanning: false }),
    new forge.PositionComponent(0, 0),
  ]);

  createStarfield(world, 500, worldSpace);

  const riveFile = await riveCache.getOrLoad(riveFileUri);
  const riveCanvas = forge.createCanvas(forge.DEFAULT_LAYERS.ui, gameContainer);

  const riveRenderLayer = new forge.RiveRenderLayer(
    forge.DEFAULT_LAYERS.ui,
    riveCanvas,
    {
      riveFile,
      stateMachines: riveStateMachine,
      canvas: riveCanvas,
      layout: new Layout({
        fit: Fit.Layout,
        alignment: Alignment.Center,
      }),
    },
  );

  const onStartClickedEvent =
    new forge.ParameterizedForgeEvent<RiveEventPayload>(
      `rive_${riveStartOnClickedEventName}`,
    );

  riveRenderLayer.registerRiveEvent(
    riveStartOnClickedEventName,
    onStartClickedEvent,
  );

  layerService.registerLayer(riveRenderLayer);

  onStartClickedEvent.registerListener(async () => {
    game.registerScene(await createPerlinNoiseScene(game, gameContainer, time));

    game.deregisterScene(scene);
  });

  const animationSystem = new forge.AnimationSystem(game.time);

  world.addSystem(animationSystem);

  const cameraSystem = new forge.CameraSystem(inputsEntity, game.time);

  world.addEntity(cameraEntity);
  world.addSystem(cameraSystem);

  scene.registerUpdatable(world);
  scene.registerStoppable(world);
  scene.registerStoppable(riveRenderLayer);

  return scene;
}
