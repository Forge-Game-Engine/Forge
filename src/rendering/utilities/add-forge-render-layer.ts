import { SpriteAnimationManager } from '../../animations';
import { type World } from '../../ecs';
import {
  ParticleBatchComponent,
  RenderableBatchComponent,
} from '../components';
import type { LayerService } from '../layer-service';
import { ForgeRenderLayer } from '../render-layers';
import { RenderSystem, SpriteBatchingSystem } from '../systems';
import { ParticleBatchingSystem } from '../systems/particle-batching-system';
import { createCanvas } from './create-canvas';

/**
 * Adds a Forge render layer to the game container and registers it with the layer service.
 * It also creates a render system and a batching system for the layer.
 * @param layerName - The name of the layer.
 * @param gameContainer - The HTML element that will contain the canvas.
 * @param layerService - The layer service to register the layer with.
 * @param world - The ECS world to which the systems will be added.
 * @param animationManager - The sprite animation manager to handle animations.
 * @returns An array containing the created layer and canvas.
 */
export function addForgeRenderLayer(
  layerName: string,
  gameContainer: HTMLElement,
  layerService: LayerService,
  world: World,
  animationManager: SpriteAnimationManager,
) {
  const canvas = createCanvas(`forge-layer-${layerName}`, gameContainer);
  const layer = new ForgeRenderLayer(layerName, canvas);

  layerService.registerLayer(layer);

  const layerRenderSystem = new RenderSystem({
    layer,
    animationManager,
  });

  world.addSystem(layerRenderSystem);

  const batcherEntity = world.buildAndAddEntity('renderable batcher', [
    new RenderableBatchComponent(layer),
    new ParticleBatchComponent(layer),
  ]);

  const spriteBatchingSystem = new SpriteBatchingSystem(batcherEntity);
  const particleBatchingSystem = new ParticleBatchingSystem(batcherEntity);

  world.addSystem(spriteBatchingSystem);
  world.addSystem(particleBatchingSystem);

  return layer;
}
