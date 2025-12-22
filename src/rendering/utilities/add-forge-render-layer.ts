import { type World } from '../../ecs/index.js';
import { RenderableBatchComponent } from '../components/index.js';
import type { LayerService } from '../layer-service.js';
import { ForgeRenderLayer } from '../render-layers/index.js';
import { RenderSystem, SpriteBatchingSystem } from '../systems/index.js';

/**
 * Adds a Forge render layer to the game container and registers it with the layer service.
 * It also creates a render system and a batching system for the layer.
 * @param layerName - The name of the layer.
 * @param _gameContainer - The HTML element that will contain the canvas (unused, kept for backward compatibility).
 * @param layerService - The layer service to register the layer with.
 * @param world - The ECS world to which the systems will be added.
 * @returns An array containing the created layer and canvas.
 */
export function addForgeRenderLayer(
  layerName: string,
  _gameContainer: HTMLElement,
  layerService: LayerService,
  world: World,
): ForgeRenderLayer {
  const layer = layerService.createForgeRenderLayer(layerName);

  const layerRenderSystem = new RenderSystem({
    layer,
  });

  world.addSystem(layerRenderSystem);

  const batcherEntity = world.buildAndAddEntity('renderable batcher', [
    new RenderableBatchComponent(layer),
  ]);

  const batchingSystem = new SpriteBatchingSystem(layerName, batcherEntity);

  world.addSystem(batchingSystem);

  return layer;
}
