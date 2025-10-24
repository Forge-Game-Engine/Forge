import {
  addForgeRenderLayers,
  DEFAULT_LAYER_NAMES,
  type ForgeRenderLayer,
  LayerService,
} from '../../rendering/index.js';
import { Game } from '../game.js';
import { World } from '../world.js';

export const registerRendering = (
  game: Game,
  world: World,
  renderLayerNames: string[] = DEFAULT_LAYER_NAMES,
): {
  renderLayers: ForgeRenderLayer[];
  layerService: LayerService;
} => {
  const layerService = new LayerService(game);
  const renderLayers = addForgeRenderLayers(
    renderLayerNames,
    game.container,
    layerService,
    world,
  );

  game.onWindowResize.registerListener(() => {
    layerService.resizeAllLayers();
  });

  return {
    renderLayers,
    layerService,
  };
};
