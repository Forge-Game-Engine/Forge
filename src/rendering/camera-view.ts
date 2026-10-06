import { PositionEcsComponent, positionId } from '../common/index.js';
import { EcsWorld } from '../ecs/ecs-world.js';
import { Rect, Vector2 } from '../math/index.js';
import { CameraEcsComponent, cameraId } from './components/index.js';
import { RenderContext } from './render-context.js';

/**
 * What a camera sees this frame, and conversions between its world and the
 * viewport (the canvas, in CSS pixels).
 *
 * Computed from the camera's components when asked for (see
 * `computeCameraView` and `getCameraView`), so it's never stored and can't
 * disagree with the camera.
 */
export interface CameraView {
  /** The world-space area the camera shows. */
  readonly bounds: Rect;

  /** `bounds`' size, in world units. */
  readonly size: Vector2;

  /** CSS pixels per world unit on the canvas. */
  readonly pixelsPerUnit: number;

  /**
   * Converts a world position to a viewport position: CSS pixels from the
   * canvas's top-left corner, Y-down, like pointer positions (e.g.
   * `MouseInputSource.position`).
   * @param worldPosition - The position in world space.
   * @returns A new vector holding the position on the canvas, in CSS pixels.
   */
  worldToViewport(worldPosition: Vector2): Vector2;

  /**
   * Converts a viewport position (CSS pixels from the canvas's top-left
   * corner, Y-down, e.g. `MouseInputSource.position`) to a world position.
   * The inverse of `worldToViewport`.
   * @param viewportPosition - The position on the canvas, in CSS pixels.
   * @returns A new vector holding the position in world space.
   */
  viewportToWorld(viewportPosition: Vector2): Vector2;
}

function assertPositive(name: string, value: number): void {
  if (Number.isNaN(value) || value <= 0) {
    throw new Error(
      `Unable to compute a camera view: ${name} must be a positive number, received ${value}.`,
    );
  }
}

/**
 * Computes what a camera sees, from components a system already has.
 *
 * The view is `verticalWorldUnits / zoom` world units tall, centered on the
 * camera's `position.world`, with its width following the canvas's aspect
 * ratio. A camera with a `renderTarget` gets the same view: a present pass
 * stretches the target over the whole canvas, so its contents are laid out
 * at the canvas's aspect ratio. Viewport conversions are against the
 * canvas's CSS size, because pointer input, the DOM and safe-area insets
 * all measure in CSS pixels.
 *
 * The view reflects the components as they are when this is called: a
 * caller that runs before the transform system sees last frame's
 * `position.world`.
 * @param camera - The camera's `CameraEcsComponent`.
 * @param position - The camera's `PositionEcsComponent`.
 * @param renderContext - The render context the camera draws through.
 * @returns The camera's view.
 * @throws An error if the camera's `verticalWorldUnits` or `zoom`, or the
 * canvas's size, isn't positive.
 */
export function computeCameraView(
  camera: CameraEcsComponent,
  position: PositionEcsComponent,
  renderContext: RenderContext,
): CameraView {
  const { verticalWorldUnits, zoom } = camera;
  const { cssWidth, cssHeight } = renderContext;

  assertPositive('verticalWorldUnits', verticalWorldUnits);
  assertPositive('zoom', zoom);
  assertPositive('cssWidth', cssWidth);
  assertPositive('cssHeight', cssHeight);
  assertPositive('width', renderContext.width);
  assertPositive('height', renderContext.height);

  const height = verticalWorldUnits / zoom;
  // The drawing buffer's aspect ratio rather than the CSS size's: the two
  // differ by the buffer's rounding to whole pixels, and the buffer is what
  // GL draws the view into.
  const width = (height * renderContext.width) / renderContext.height;
  const { x: centerX, y: centerY } = position.world;
  const minX = centerX - width / 2;
  const maxY = centerY + height / 2;

  return {
    bounds: {
      min: { x: minX, y: centerY - height / 2 },
      max: { x: centerX + width / 2, y: maxY },
    },
    size: { x: width, y: height },
    pixelsPerUnit: cssHeight / height,
    worldToViewport: (worldPosition: Vector2): Vector2 => ({
      x: ((worldPosition.x - minX) / width) * cssWidth,
      y: ((maxY - worldPosition.y) / height) * cssHeight,
    }),
    viewportToWorld: (viewportPosition: Vector2): Vector2 => ({
      x: minX + (viewportPosition.x / cssWidth) * width,
      y: maxY - (viewportPosition.y / cssHeight) * height,
    }),
  };
}

/**
 * Computes what a camera entity sees. For game code that has the camera's
 * entity rather than its components; see `computeCameraView`.
 * @param world - The ECS world the camera entity belongs to.
 * @param camera - The camera entity.
 * @param renderContext - The render context the camera draws through.
 * @returns The camera's view.
 * @throws An error if `camera` has no `CameraEcsComponent` or
 * `PositionEcsComponent`, or if `computeCameraView` does.
 */
export function getCameraView(
  world: EcsWorld,
  camera: number,
  renderContext: RenderContext,
): CameraView {
  const cameraComponent = world.getComponent<CameraEcsComponent>(
    camera,
    cameraId,
  );
  const position = world.getComponent<PositionEcsComponent>(camera, positionId);

  if (!cameraComponent || !position) {
    throw new Error(
      `Unable to get the camera view of entity "${camera}": it needs both a camera and a position component.`,
    );
  }

  return computeCameraView(cameraComponent, position, renderContext);
}
