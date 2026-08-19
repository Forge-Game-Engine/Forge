import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vector2 } from '../../math/index.js';
import { UiScaleMode, uiScaleModes } from '../types/ui-scale-mode.js';

/**
 * Fields of {@link CanvasEcsComponent} with no sensible default; callers
 * must always provide these.
 */
export interface CanvasRequiredOptions {
  /**
   * The entity id of the dedicated UI camera this canvas draws through (see
   * `createUiCanvas`). `createUiLayoutEcsSystem` keeps this camera's
   * `verticalWorldUnits` in sync with the canvas's resolved root rect every
   * frame.
   */
  camera: number;
}

/**
 * Fields of {@link CanvasEcsComponent} with a sensible default; callers may
 * omit these.
 */
export interface CanvasDefaultedOptions {
  /**
   * The resolution UI is authored against, in reference pixels (UI world
   * units). Defaults to `1920x1080`. How the canvas's root rect departs from
   * this at other destination sizes/aspect ratios is controlled by
   * `scaleMode`.
   */
  referenceResolution: Vector2;

  /** How the canvas's root rect responds to the destination's live size. */
  scaleMode: UiScaleMode;
}

export interface CanvasEcsComponent
  extends CanvasRequiredOptions, CanvasDefaultedOptions {}

export const canvasId = createComponentId<CanvasEcsComponent>('canvas');

const defaultCanvasOptions: CanvasDefaultedOptions = {
  referenceResolution: { x: 1920, y: 1080 },
  scaleMode: uiScaleModes.scaleWithScreenSize,
};

/**
 * Attaches a {@link CanvasEcsComponent} to `entity`. A canvas also needs a
 * `RectTransformEcsComponent` (its root rect, resolved every frame from
 * `referenceResolution`/`scaleMode` rather than a parent) and a
 * `PositionEcsComponent`; use `createUiCanvas` to get a fully wired canvas
 * entity - including its dedicated camera - in one call.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the canvas. `camera` has no
 * sensible default and must always be provided.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addCanvasComponent(
  world: EcsWorld,
  entity: number,
  options: CanvasRequiredOptions & Partial<CanvasDefaultedOptions>,
): CanvasEcsComponent {
  const component: CanvasEcsComponent = {
    ...defaultCanvasOptions,
    ...options,
  };

  return world.addComponent(entity, canvasId, component);
}
