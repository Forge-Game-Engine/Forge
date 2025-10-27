import Rive from '@rive-app/webgl2';
import type { RiveCache } from '../../asset-loading/index.js';
import type { LayerService } from '../layer-service.js';
import { RiveRenderLayer } from '../render-layers/index.js';
import { DEFAULT_LAYERS } from '../enums/index.js';
import { createCanvas } from './create-canvas.js';
import { EventDispatcher } from '../../events/index.js';

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
  riveParameters?: Partial<Rive.RiveParameters>,
): Promise<readonly [RiveRenderLayer, HTMLCanvasElement, Rive.RiveFile]> {
  const riveFile = await riveCache.getOrLoad(riveFileUri);
  const canvas = createCanvas(DEFAULT_LAYERS.ui, gameContainer);

  const { rive, riveEventDispatcher } = await createRiveInstance({
    riveFile,
    canvas,
    layout: new Rive.Layout({
      fit: Rive.Fit.Layout,
      alignment: Rive.Alignment.Center,
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
function createRiveInstance(riveParameters: Rive.RiveParameters): Promise<{
  rive: Rive.Rive;
  riveEventDispatcher: EventDispatcher<Rive.RiveEventPayload>;
}> {
  return new Promise((resolve, reject) => {
    const rive = new Rive.Rive({
      autoplay: true,
      ...riveParameters,
      onLoad: (event) => {
        rive.resizeDrawingSurfaceToCanvas();

        const riveEventDispatcher =
          new EventDispatcher<Rive.RiveEventPayload>();

        rive.on(Rive.EventType.RiveEvent, (event) => {
          const eventData = event.data as Rive.RiveEventPayload;

          if (eventData.type !== Rive.RiveEventType.General) {
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
