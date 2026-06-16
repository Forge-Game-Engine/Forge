import { positionId } from '../../common/components/position-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Matrix3x3, Rect, Vector2 } from '../../math/index.js';
import {
  UiCanvasEcsComponent,
  uiCanvasId,
  UiCanvasScaleMode,
} from '../components/ui-canvas-component.js';
import { uiTransformId } from '../components/ui-transform-component.js';

/**
 * Options for {@link createUiCanvas}.
 */
export interface CreateUiCanvasOptions {
  /** Logical canvas width in CSS pixels. */
  width: number;
  /** Logical canvas height in CSS pixels. */
  height: number;
  /** Device pixel ratio. Defaults to `1`. */
  devicePixelRatio?: number;
  /**
   * Design resolution used by scale modes other than `constant-pixel`.
   * Defaults to `(width, height)`.
   */
  referenceResolution?: Vector2;
  /** Scaling mode. Defaults to `'constant-pixel'`. */
  scaleMode?: UiCanvasScaleMode;
}

/**
 * Creates the root entity of a UI hierarchy and wires up the required
 * components:
 * - {@link UiCanvasEcsComponent} — canvas dimensions and scale mode
 * - `PositionEcsComponent` — screen-space origin (0, 0), marked static
 * - {@link UiTransformEcsComponent} — full-viewport rect, ready for the layout
 *   system
 *
 * @param world - The ECS world to create the entity in.
 * @param options - Canvas dimensions and optional configuration.
 * @returns The entity id of the newly created UI canvas root.
 */
export function createUiCanvas(
  world: EcsWorld,
  options: CreateUiCanvasOptions,
): number {
  const { width, height } = options;
  const devicePixelRatio = options.devicePixelRatio ?? 1;
  const referenceResolution =
    options.referenceResolution ?? new Vector2(width, height);
  const scaleMode = options.scaleMode ?? 'constant-pixel';

  const entity = world.createEntity();

  const canvas: UiCanvasEcsComponent = {
    width,
    height,
    devicePixelRatio,
    referenceResolution,
    scaleMode,
    isDirty: true,
  };

  world.addComponent(entity, uiCanvasId, canvas);

  world.addComponent(entity, positionId, {
    local: new Vector2(0, 0),
    world: new Vector2(0, 0),
    isStatic: true,
  });

  world.addComponent(entity, uiTransformId, {
    anchorMin: new Vector2(0, 0),
    anchorMax: new Vector2(1, 1),
    offsetMin: new Vector2(0, 0),
    offsetMax: new Vector2(0, 0),
    pivot: new Vector2(0.5, 0.5),
    rotation: 0,
    scale: new Vector2(1, 1),
    resolvedRect: new Rect(new Vector2(0, 0), new Vector2(width, height)),
    worldMatrix: Matrix3x3.identity,
    isStatic: false,
    isDirty: true,
  });

  return entity;
}
