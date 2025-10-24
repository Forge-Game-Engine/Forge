import { Rive, type RiveEventPayload } from '@rive-app/webgl2';
import { RenderLayer } from './render-layer.js';
import {
  EventDispatcher,
  ParameterizedForgeEvent,
} from '../../events/index.js';
import type { Stoppable } from '../../common/index.js';

/**
 * The `RiveRenderLayer` class represents a rendering layer with its own canvas and rive instance.
 */
export class RiveRenderLayer extends RenderLayer implements Stoppable {
  /** The Rive instance associated with the render layer. */
  public rive: Rive;

  /** The event dispatcher for Rive events. */
  private readonly _riveEventDispatcher: EventDispatcher<RiveEventPayload>;

  /**
   * Constructs a new instance of the `RiveRenderLayer` class.
   * @param name - The name of the render layer.
   * @param canvas - The canvas element associated with the render layer.
   * @param rive - The Rive instance to use for rendering.
   * @param riveEventDispatcher - The event dispatcher for Rive events.
   */
  constructor(
    name: string,
    canvas: HTMLCanvasElement,
    rive: Rive,
    riveEventDispatcher: EventDispatcher<RiveEventPayload>,
  ) {
    super(name, canvas);

    this.rive = rive;
    this._riveEventDispatcher = riveEventDispatcher;
  }

  /**
   * Resizes the canvas to the specified width and height, and updates the Rive instance.
   * @param width - The new width of the canvas.
   * @param height - The new height of the canvas.
   */
  public override resize(width: number, height: number): void {
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
  ): void {
    this._riveEventDispatcher.addEventListener(riveEventName, event);
  }

  /**
   * Stops the render layer by clearing the canvas and cleaning up the Rive instance.
   */
  public stop(): void {
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
