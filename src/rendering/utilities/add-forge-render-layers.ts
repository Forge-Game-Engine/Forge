import { SpriteAnimationManager } from '../../animations';
import { type World } from '../../ecs';
import type { LayerService } from '../layer-service';
import type { ForgeRenderLayer } from '../render-layers';
import { addForgeRenderLayer } from './add-forge-render-layer';

/**
 * Adds multiple Forge render layers to the game container and registers them with the layer service.
 * It also creates a render system and a batching system per layer.
 * @param layerNames - The name of the layers.
 * @param gameContainer - The HTML element that will contain the canvas.
 * @param layerService - The layer service to register the layers with.
 * @param world - The ECS world to which the systems will be added.
 * @returns An array containing the created layer and canvas details.
 */
export function addForgeRenderLayers(
  layerNames: string[],
  gameContainer: HTMLElement,
  layerService: LayerService,
  world: World,
  animationManager: SpriteAnimationManager,
) {
  const renderLayers = new Array<ForgeRenderLayer>();

  for (const layerName of layerNames) {
    const renderLayer = addForgeRenderLayer(
      layerName,
      gameContainer,
      layerService,
      world,
      animationManager,
    );

    renderLayers.push(renderLayer);
  }

  return renderLayers;
}
