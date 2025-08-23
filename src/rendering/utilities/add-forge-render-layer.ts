import { type World } from '../../ecs';
import { RenderableBatchComponent } from '../components';
import type { LayerService } from '../layer-service';
import { ForgeRenderLayer } from '../render-layers';
import { RenderSystem, SpriteBatchingSystem } from '../systems';
import { createCanvas } from './create-canvas';

/**
 * Adds a Forge render layer to the game container and registers it with the layer service.
 * It also creates a render system and a batching system for the layer.
 * @param layerName - The name of the layer.
 * @param gameContainer - The HTML element that will contain the canvas.
 * @param layerService - The layer service to register the layer with.
 * @param world - The ECS world to which the systems will be added.
 * @param animationSetManager - The sprite animation manager to handle animations.
 * @returns An array containing the created layer and canvas.
 */
export function addForgeRenderLayer(
  layerName: string,
  gameContainer: HTMLElement,
  layerService: LayerService,
  world: World,
) {
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

  const spriteBatchingSystem = new SpriteBatchingSystem(batcherEntity);

  world.addSystem(spriteBatchingSystem);

  return layer;
}
