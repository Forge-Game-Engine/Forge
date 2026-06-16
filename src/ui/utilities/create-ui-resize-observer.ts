import { EcsWorld } from '../../ecs/ecs-world.js';
import { ParameterizedForgeEvent } from '../../events/parameterized-forge-event.js';
import { uiCanvasId } from '../components/ui-canvas-component.js';

/** Payload emitted by the resize event. */
export interface UiCanvasResizeEventData {
  /** New logical width of the canvas in CSS pixels. */
  width: number;
  /** New logical height of the canvas in CSS pixels. */
  height: number;
}

/**
 * Handle returned by {@link createUiResizeObserver}.
 * Implements the `Stoppable` contract so it can be torn down cleanly when the
 * world or scene is destroyed.
 */
export interface UiResizeObserver {
  /**
   * Fired once per coalesced resize event (one per animation frame at most,
   * because `ResizeObserver` already batches callbacks per frame).
   * Subscribe to update projection matrices, UI overlays, etc.
   */
  onResize: ParameterizedForgeEvent<UiCanvasResizeEventData>;

  /**
   * Disconnects the underlying `ResizeObserver` and prevents further updates.
   * Call this when the world or scene is torn down to avoid leaks.
   */
  stop(): void;
}

/**
 * Wires a `ResizeObserver` on `element` to keep the UI canvas component in
 * sync with the container's size, and emits a {@link ParameterizedForgeEvent}
 * named `uiCanvasResized` on every coalesced resize.
 *
 * `ResizeObserver` already coalesces multiple DOM size changes within the same
 * animation frame into a single callback invocation, so the layout system
 * receives at most one dirty signal per frame even during rapid resize storms.
 *
 * **Teardown:** call `stop()` on the returned handle when the world is
 * destroyed to prevent the observer from holding a reference to the container.
 *
 * @param element - The DOM element to observe (typically the game container).
 * @param canvasEntity - Entity id of the UI canvas root created by
 *   {@link createUiCanvas}.
 * @param world - The ECS world that owns `canvasEntity`.
 * @returns A handle with an `onResize` event and a `stop()` method.
 */
export function createUiResizeObserver(
  element: HTMLElement,
  canvasEntity: number,
  world: EcsWorld,
): UiResizeObserver {
  const onResize = new ParameterizedForgeEvent<UiCanvasResizeEventData>(
    'uiCanvasResized',
  );

  const observer = new ResizeObserver((entries) => {
    const entry = entries[entries.length - 1];

    if (!entry) {
      return;
    }

    const { width, height } = entry.contentRect;
    const devicePixelRatio = window.devicePixelRatio ?? 1;

    const canvas = world.getComponent(canvasEntity, uiCanvasId);

    if (canvas) {
      canvas.width = width;
      canvas.height = height;
      canvas.devicePixelRatio = devicePixelRatio;
      canvas.isDirty = true;
    }

    onResize.raise({ width, height });
  });

  observer.observe(element);

  return {
    onResize,
    stop(): void {
      observer.unobserve(element);
      observer.disconnect();
    },
  };
}
