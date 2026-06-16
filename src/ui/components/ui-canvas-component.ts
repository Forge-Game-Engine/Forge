import { createComponentId } from '../../ecs/ecs-component.js';
import { Vector2 } from '../../math/index.js';

/** Scaling modes for the UI canvas. */
export type UiCanvasScaleMode =
  | 'constant-pixel'
  | 'scale-with-width'
  | 'scale-with-height'
  | 'match';

/**
 * Root component for a UI tree. Describes the logical canvas dimensions and
 * scaling behaviour. All UI coordinates are in screen-space pixels (top-left
 * origin, +Y down). Attach this to the root entity of a UI hierarchy and let
 * child entities descend via {@link ParentEcsComponent}.
 */
export interface UiCanvasEcsComponent {
  /** Current logical width of the canvas in CSS pixels. */
  width: number;

  /** Current logical height of the canvas in CSS pixels. */
  height: number;

  /** Device pixel ratio at the time of the last resize. */
  devicePixelRatio: number;

  /**
   * Design resolution used as the reference for scale modes other than
   * `constant-pixel`.
   */
  referenceResolution: Vector2;

  /**
   * Controls how UI elements scale when the canvas size differs from
   * `referenceResolution`.
   *
   * - `constant-pixel` — no scaling; elements keep their authored pixel sizes.
   * - `scale-with-width` — scale uniformly based on width ratio. (Epic 1 scope: no-op)
   * - `scale-with-height` — scale uniformly based on height ratio. (Epic 1 scope: no-op)
   * - `match` — blend between width and height scaling. (Epic 1 scope: no-op)
   */
  scaleMode: UiCanvasScaleMode;

  /**
   * Set to `true` by the resize observer when the canvas dimensions change.
   * Consumed and cleared by the layout system at the start of each frame to
   * coalesce multiple resize events into a single layout pass.
   */
  isDirty: boolean;
}

/** Component id for {@link UiCanvasEcsComponent}. */
export const uiCanvasId = createComponentId<UiCanvasEcsComponent>('ui-canvas');
