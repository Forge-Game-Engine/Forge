import { type World } from 'forge/ecs';
import { RenderableBatchComponent } from 'forge/rendering/components';
import type { LayerService } from 'forge/rendering/layer-service';
import { ForgeRenderLayer } from 'forge/rendering/render-layers';
import { RenderSystem, SpriteBatchingSystem } from 'forge/rendering/systems';
import { createCanvas } from './create-canvas';

/**
 * Adds a Forge render layer to the game container and registers it with the layer service.
 * It also creates a render system and a batching system for the layer.
 * @param layerName - The name of the layer.
 * @param gameContainer - The HTML element that will contain the canvas.
 * @param layerService - The layer service to register the layer with.
 * @param world - The ECS world to which the systems will be added.
 * @returns An array containing the created layer and canvas.
 */
export function addForgeRenderLayer(
  layerName: string,
  gameContainer: HTMLElement,
  layerService: LayerService,
  world: World,
): ForgeRenderLayer {
  const canvas = createCanvas(`forge-layer-${layerName}`, gameContainer);
  const layer = new ForgeRenderLayer(layerName, canvas);

  layerService.registerLayer(layer);

  const layerRenderSystem = new RenderSystem({
    layer,
  });

  world.addSystem(layerRenderSystem);

  const batcherEntity = world.buildAndAddEntity('renderable batcher', [
    new RenderableBatchComponent(layer),
  ]);

  const batchingSystem = new SpriteBatchingSystem(batcherEntity);

  world.addSystem(batchingSystem);

  return layer;
}
