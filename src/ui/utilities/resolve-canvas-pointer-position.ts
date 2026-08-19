import { positionId } from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { MouseInputSource } from '../../input/index.js';
import { Vector2 } from '../../math/index.js';
import {
  calculatePixelsPerUnit,
  CameraEcsComponent,
  cameraId,
  RenderContext,
  screenToWorldSpace,
} from '../../rendering/index.js';
import { CanvasEcsComponent } from '../components/canvas-component.js';

/**
 * Converts `mouseInputSource`'s current pointer position - canvas pixels,
 * Y-down (see `MouseInputSource.position`) - into `canvas`'s own UI world
 * space, through its dedicated camera (see `design/ui-system.md`'s §5.2
 * "Coordinate spaces" and DL-07). Two canvases with different cameras (e.g.
 * different `verticalWorldUnits`) convert the same pointer position
 * differently, which is why this takes a specific canvas rather than
 * publishing one shared "the" UI world position.
 * @param world - The ECS world `canvas`'s camera entity belongs to.
 * @param canvas - The canvas to convert the pointer position for.
 * @param renderContext - The render context the canvas's camera renders
 * through.
 * @param mouseInputSource - The pointer source to read the canvas-space
 * position from.
 * @returns The pointer position in `canvas`'s UI world space, or `null` if
 * the canvas's camera entity is missing its `CameraEcsComponent`/
 * `PositionEcsComponent`.
 */
export function resolveCanvasPointerPosition(
  world: EcsWorld,
  canvas: CanvasEcsComponent,
  renderContext: RenderContext,
  mouseInputSource: MouseInputSource,
): Vector2 | null {
  const camera = world.getComponent<CameraEcsComponent>(
    canvas.camera,
    cameraId,
  );
  const cameraPosition = world.getComponent(canvas.camera, positionId);

  if (!camera || !cameraPosition) {
    return null;
  }

  const pixelsPerUnit = calculatePixelsPerUnit(
    renderContext.height,
    camera.verticalWorldUnits,
  );

  return screenToWorldSpace(
    mouseInputSource.position,
    cameraPosition.world,
    camera.zoom,
    renderContext.width,
    renderContext.height,
    pixelsPerUnit,
  );
}
