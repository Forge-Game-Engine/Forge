import { Alignment, Fit, Layout, type RiveParameters } from '@rive-app/webgl2';
import type { RiveCache } from '../../asset-loading';
import type { LayerService } from '../layer-service';
import { RiveRenderLayer } from '../render-layers';
import { DEFAULT_LAYERS } from '../enums';
import { createCanvas } from './create-canvas';

/**
 * Adds a Rive render layer to the game container and registers it with the layer service.
 * It also creates a canvas for the layer.
 * @param gameContainer - The HTML element that will contain the canvas.
 * @param layerService - The layer service to register the layer with.
 * @param riveCache - The Rive cache to load the Rive file from.
 * @param riveFileUri - The URI of the Rive file to load.
 * @param stateMachines - The name of the state machine to use in the Rive file.
 * @param riveParameters - Additional parameters for the Rive layer.
 * @returns An array containing the created layer, canvas, and Rive file.
 */
export async function addRiveRenderLayer(
  gameContainer: HTMLElement,
  layerService: LayerService,
  riveCache: RiveCache,
  riveFileUri: string,
  stateMachines: string | string[],
  riveParameters?: RiveParameters,
) {
  const riveFile = await riveCache.getOrLoad(riveFileUri);

  const canvas = createCanvas(DEFAULT_LAYERS.ui, gameContainer);

  const layer = new RiveRenderLayer(DEFAULT_LAYERS.ui, canvas, {
    riveFile,
    stateMachines,
    canvas,
    layout: new Layout({
      fit: Fit.Layout,
      alignment: Alignment.Center,
    }),
    ...riveParameters,
  });

  layerService.registerLayer(layer);

  return [layer, canvas, riveFile] as const;
}
