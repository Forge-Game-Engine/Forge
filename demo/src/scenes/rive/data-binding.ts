import {
  addRiveRenderLayer,
  createScene,
  Game,
  RiveCache,
} from '../../../../src';

const RIVE_FILE_URI = 'ui.riv';
const RIVE_STATE_MACHINE = 'PleaseSM';
const RIVE_ARTBOARD = 'PleaseAB';

export async function createDataBindingScene(
  game: Game,
  gameContainer: HTMLElement,
  riveCache: RiveCache,
) {
  const { scene, layerService } = createScene(
    'data-binding',
    game,
    gameContainer,
  );

  await addRiveRenderLayer(
    gameContainer,
    layerService,
    riveCache,
    RIVE_FILE_URI,
    {
      artboard: RIVE_ARTBOARD,
      stateMachines: RIVE_STATE_MACHINE,
    },
  );

  return scene;
}
