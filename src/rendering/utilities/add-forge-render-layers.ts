import { Entity, type World } from '../../ecs';
import type { LayerService } from '../layer-service';
import { ForgeRenderLayer } from '../render-layers';
import { addForgeRenderLayer } from './add-forge-render-layer';

/**
 * Represents the details of a Forge render layer, including the layer itself and its associated canvas.
 * @property layer - The Forge render layer instance.
 * @property canvas - The HTML canvas element associated with the render layer.
 */
type LayerDetail = {
  layer: ForgeRenderLayer;
  canvas: HTMLCanvasElement;
};

/**
 * Adds multiple Forge render layers to the game container and registers them with the layer service.
 * It also creates a render system and a batching system per layer.
 * @param layerNames - The name of the layers.
 * @param gameContainer - The HTML element that will contain the canvas.
 * @param layerService - The layer service to register the layers with.
 * @param world - The ECS world to which the systems will be added.
 * @param cameraEntity - The entity representing the camera.
 * @returns An array containing the created layer and canvas details.
 */
export function addForgeRenderLayers(
  layerNames: string[],
  gameContainer: HTMLElement,
  layerService: LayerService,
  world: World,
  cameraEntity: Entity,
) {
  const layerDetails = new Array<LayerDetail>();

  for (const layerName of layerNames) {
    const [layer, canvas] = addForgeRenderLayer(
      layerName,
      gameContainer,
      layerService,
      world,
      cameraEntity,
    );

    layerDetails.push({ layer, canvas });
  }

  return layerDetails;
}
