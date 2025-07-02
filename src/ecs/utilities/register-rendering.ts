import {
  addForgeRenderLayers,
  DEFAULT_LAYER_NAMES,
  LayerService,
} from '../../rendering';
import { Entity } from '../entity';
import { Game } from '../game';
import { World } from '../world';

interface Inputs {
  world: World;
  game: Game;
  cameraEntity: Entity;
}

export const registerRendering =
  (renderLayerNames: string[] = DEFAULT_LAYER_NAMES) =>
  <TInputs extends Inputs>(inputs: TInputs) => {
    const { game, world, cameraEntity } = inputs;

    const layerService = new LayerService(game);

    const renderLayers = addForgeRenderLayers(
      renderLayerNames,
      game.container,
      layerService,
      world,
      cameraEntity,
    );

    game.onWindowResize.registerListener(() => {
      layerService.resizeAllLayers();
    });

    return {
      ...inputs,
      renderLayers,
      layerService,
    };
  };
