import {
  EventType,
  Rive,
  type RiveEventPayload,
  RiveEventType,
  type RiveParameters,
} from '@rive-app/webgl2';
import { RenderLayer } from './render-layer';
import { EventDispatcher, ParameterizedForgeEvent } from '../../events';
import type { Stoppable } from '../../common';

/**
 * The `RiveRenderLayer` class represents a rendering layer with its own canvas and rive instance.
 */
export class RiveRenderLayer extends RenderLayer implements Stoppable {
  /** The Rive instance associated with the render layer. */
  public rive: Rive;

  /** The event dispatcher for Rive events. */
  private _riveEventDispatcher: EventDispatcher<RiveEventPayload>;

  /**
   * Constructs a new instance of the `RiveRenderLayer` class.
   * @param name - The name of the render layer.
   * @param canvas - The canvas element associated with the render layer.
   * @param riveParameters - The Rive parameters to use. See https://rive.app/docs/runtimes/web/rive-parameters for more information.
   */
  constructor(
    name: string,
    canvas: HTMLCanvasElement,
    riveParameters: RiveParameters,
  ) {
    super(name, canvas);

    const { rive, riveEventDispatcher } =
      this._createRiveInstance(riveParameters);

    this.rive = rive;
    this._riveEventDispatcher = riveEventDispatcher;
  }

  /**
   * Resizes the canvas to the specified width and height, and updates the Rive instance.
   * @param width - The new width of the canvas.
   * @param height - The new height of the canvas.
   */
  public override resize(width: number, height: number) {
    super.resize(width, height);
    this.rive.resizeDrawingSurfaceToCanvas();
  }

  /**
   * Registers a Rive event with the specified name and event handler.
   * @param riveEventName - The name of the Rive event.
   * @param event - The event handler to register.
   */
  public registerRiveEvent(
    riveEventName: string,
    event: ParameterizedForgeEvent<RiveEventPayload>,
  ) {
    this._riveEventDispatcher.addEventListener(riveEventName, event);
  }

  /**
   * Creates a new Rive instance with the specified Rive file, canvas, and state machines.
   * @param riveParameters - The Rive parameters to use. See https://rive.app/docs/runtimes/web/rive-parameters for more information.
   * @returns An object containing the Rive instance and event dispatcher.
   */
  private _createRiveInstance(riveParameters: RiveParameters) {
    const rive = new Rive({
      autoplay: true,
      onLoad: () => {
        // Prevent a blurry canvas by using the device pixel ratio
        rive.resizeDrawingSurfaceToCanvas();
      },
      ...riveParameters,
    });

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

    return { rive, riveEventDispatcher };
  }

  /**
   * Stops the render layer by clearing the canvas and cleaning up the Rive instance.
   */
  public stop() {
    const gl =
      this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
    if (gl) {
      // It's WebGL
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    } else {
      // Must be 2D
      const ctx = this.canvas.getContext('2d')!;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.rive.cleanup();
  }
}
