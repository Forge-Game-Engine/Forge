import { SpriteAnimationManager } from '../../animations';
import {
  addForgeRenderLayers,
  DEFAULT_LAYER_NAMES,
  LayerService,
} from '../../rendering';
import { Game } from '../game';
import { World } from '../world';

export const registerRendering = (
  game: Game,
  world: World,
  animationManager: SpriteAnimationManager,
  renderLayerNames: string[] = DEFAULT_LAYER_NAMES,
) => {
  const layerService = new LayerService(game);
  const renderLayers = addForgeRenderLayers(
    renderLayerNames,
    game.container,
    layerService,
    world,
    animationManager,
  );

  game.onWindowResize.registerListener(() => {
    layerService.resizeAllLayers();
  });

  return {
    renderLayers,
    layerService,
  };
};
