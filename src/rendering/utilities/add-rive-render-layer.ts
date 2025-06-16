import {
  Alignment,
  EventType,
  Fit,
  Layout,
  Rive,
  type RiveEventPayload,
  RiveEventType,
  type RiveParameters,
} from '@rive-app/webgl2';
import type { RiveCache } from '../../asset-loading';
import type { LayerService } from '../layer-service';
import { RiveRenderLayer } from '../render-layers';
import { DEFAULT_LAYERS } from '../enums';
import { createCanvas } from './create-canvas';
import { EventDispatcher } from '../../events';

/**
 * Adds a Rive render layer to the game container and registers it with the layer service.
 * It also creates a canvas for the layer.
 * @param riveFileUri - The URI of the Rive file to load.
 * @param gameContainer - The HTML element that will contain the canvas.
 * @param layerService - The layer service to register the layer with.
 * @param riveCache - The Rive cache to load the Rive file from.
 * @param riveParameters - Additional parameters for the Rive layer.
 * @returns An array containing the created layer, canvas, and Rive file.
 */
export async function addRiveRenderLayer(
  riveFileUri: string,
  gameContainer: HTMLElement,
  layerService: LayerService,
  riveCache: RiveCache,
  riveParameters?: Partial<RiveParameters>,
) {
  const riveFile = await riveCache.getOrLoad(riveFileUri);
  const canvas = createCanvas(DEFAULT_LAYERS.ui, gameContainer);

  const { rive, riveEventDispatcher } = await createRiveInstance({
    riveFile,
    canvas,
    layout: new Layout({
      fit: Fit.Layout,
      alignment: Alignment.Center,
    }),
    ...riveParameters,
  });

  const layer = new RiveRenderLayer(
    DEFAULT_LAYERS.ui,
    canvas,
    rive,
    riveEventDispatcher,
  );

  layerService.registerLayer(layer);

  return [layer, canvas, riveFile] as const;
}

/**
 * Creates a new Rive instance with the specified Rive file, canvas, and state machines.
 * @param riveParameters - The Rive parameters to use. See https://rive.app/docs/runtimes/web/rive-parameters for more information.
 * @returns An object containing the Rive instance and event dispatcher.
 */
function createRiveInstance(riveParameters: RiveParameters): Promise<{
  rive: Rive;
  riveEventDispatcher: EventDispatcher<RiveEventPayload>;
}> {
  return new Promise((resolve, reject) => {
    const rive = new Rive({
      autoplay: true,
      ...riveParameters,
      onLoad: (event) => {
        rive.resizeDrawingSurfaceToCanvas();

        const riveEventDispatcher = new EventDispatcher<RiveEventPayload>();

        rive.on(EventType.RiveEvent, (event) => {
          const eventData = event.data as RiveEventPayload;

          if (eventData.type !== RiveEventType.General) {
            throw new Error(
              'Forge only handles general rive events. See https://rive.app/docs/editor/events/overview#type for more information.',
            );
          }

          riveEventDispatcher.dispatchEvent(eventData.name, eventData);
        });

        riveParameters.onLoad?.(event);

        resolve({ rive, riveEventDispatcher });
      },
      onLoadError: (error) => {
        console.error('Rive load error:', error);

        riveParameters.onLoadError?.(error);

        reject(
          new Error(
            `Failed to load Rive file: ${JSON.stringify(error.data)} - type: ${error.type}`,
          ),
        );
      },
    });
  });
}
