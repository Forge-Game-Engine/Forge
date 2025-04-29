import { Alignment, Fit, Layout } from '@rive-app/webgl2';
import type { RiveCache } from '../../asset-loading';
import type { LayerService } from '../layer-service';
import { RiveRenderLayer } from '../render-layers';
import { DEFAULT_LAYERS } from '../types';
import { createCanvas } from './create-canvas';

export async function addRiveRenderLayer(
  gameContainer: HTMLElement,
  layerService: LayerService,
  riveCache: RiveCache,
  riveFileUri: string,
  riveStateMachine: string,
) {
  const riveFile = await riveCache.getOrLoad(riveFileUri);

  const canvas = createCanvas(DEFAULT_LAYERS.ui, gameContainer);

  const layer = new RiveRenderLayer(DEFAULT_LAYERS.ui, canvas, {
    riveFile,
    stateMachines: riveStateMachine,
    canvas: canvas,
    layout: new Layout({
      fit: Fit.Layout,
      alignment: Alignment.Center,
    }),
  });

  layerService.registerLayer(layer);

  return [layer, canvas, riveFile] as const;
}
