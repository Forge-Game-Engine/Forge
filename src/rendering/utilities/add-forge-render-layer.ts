import { Entity, type World } from '../../ecs';
import { RenderableBatchComponent } from '../components';
import type { LayerService } from '../layer-service';
import { ForgeRenderLayer } from '../render-layers';
import { RenderSystem, SpriteBatchingSystem } from '../systems';
import { createCanvas } from './create-canvas';

export function addForgeRenderLayer(
  layerName: string,
  gameContainer: HTMLElement,
  layerService: LayerService,
  world: World,
  cameraEntity: Entity,
) {
  const canvas = createCanvas(`forge-layer-${layerName}`, gameContainer);
  const layer = new ForgeRenderLayer(layerName, canvas);

  layerService.registerLayer(layer);

  const layerRenderSystem = new RenderSystem({
    layer,
    cameraEntity,
  });

  world.addSystem(layerRenderSystem);

  const batcherEntity = new Entity('renderable batcher', [
    new RenderableBatchComponent(layer),
  ]);

  const batchingSystem = new SpriteBatchingSystem(batcherEntity);

  world.addEntity(batcherEntity);
  world.addSystem(batchingSystem);

  return [layer, canvas] as const;
}
