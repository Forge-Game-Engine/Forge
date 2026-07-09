import { Axis1dAction, Axis2dAction } from '../../input/index.js';
import { Rect } from '../../math/index.js';
import { createComponentId } from '../../ecs/ecs-component.js';
import { RenderTarget } from '../render-target.js';

export interface CameraEcsComponent {
  /**
   * The current zoom level. Higher values zoom in (the view covers less of
   * the world); lower values zoom out. Adjusted by `zoomInput` (via
   * `zoomSensitivity`) when the camera isn't `isStatic`, and clamped to
   * `[minZoom, maxZoom]`.
   */
  zoom: number;

  /**
   * How strongly `zoomInput` changes `zoom`. Applied exponentially (see
   * `createCameraEcsSystem`) so scrolling has a consistent relative effect
   * regardless of the current zoom level.
   */
  zoomSensitivity: number;

  /**
   * How strongly `panInput` moves the camera's position. Scaled by the
   * inverse of the current `zoom`, so panning covers the same apparent
   * distance on screen at any zoom level.
   */
  panSensitivity: number;

  /**
   * The lower bound `zoom` is clamped to.
   */
  minZoom: number;

  /**
   * The upper bound `zoom` is clamped to.
   */
  maxZoom: number;

  /**
   * When `true`, this camera ignores `zoomInput` and `panInput` entirely
   * (`createCameraEcsSystem` returns early for it). Use for cameras whose
   * position and zoom are driven by other means, or that should never move.
   */
  isStatic: boolean;

  /**
   * A bitmask matched against each sprite's `Renderable.category`
   * (`matchesMask`) to decide whether this camera draws it. Defaults to
   * `0xffffffff` (every category) in `addCamera`.
   */
  cullingMask: number;

  /**
   * When set, restricts this camera's draw output to the given rectangular
   * region instead of its full destination.
   */
  scissorRect?: Rect;

  /**
   * The 1D input action that drives `zoom` changes, if any. Ignored while
   * `isStatic` is `true`.
   */
  zoomInput?: Axis1dAction;

  /**
   * The 2D input action that drives panning (the camera's local position),
   * if any. Ignored while `isStatic` is `true`.
   */
  panInput?: Axis2dAction;

  /**
   * When set, this camera renders into the given off-screen render target
   * instead of directly onto the canvas. A present pass is then responsible
   * for drawing the target's color texture onto the canvas.
   */
  renderTarget?: RenderTarget;

  /**
   * The draw-order layer for this camera's `renderTarget`, relative to other
   * cameras presented in the same frame: lower layers are presented (and
   * thus drawn onto the canvas) first, so higher layers appear on top. Only
   * meaningful between cameras with *different* render targets; has no
   * effect on cameras that share one (they're already composited together
   * before presenting) or that render straight to the canvas.
   */
  layer: number;
}

export const cameraId = createComponentId<CameraEcsComponent>('camera');
