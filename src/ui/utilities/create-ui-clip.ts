import { EcsWorld } from '../../ecs/ecs-world.js';
import { Rect, Vector2 } from '../../math/index.js';
import { uiClipId } from '../components/ui-clip-component.js';
import { uiTransformId } from '../components/ui-transform-component.js';

/**
 * Options for {@link createUiClip}.
 */
export interface CreateUiClipOptions {
  /** When `false` clipping is disabled until set back to `true`. Default `true`. */
  enabled?: boolean;
}

const defaultCreateUiClipOptions: Required<CreateUiClipOptions> = {
  enabled: true,
};

/**
 * Attaches a {@link UiClipEcsComponent} to an existing UI entity, turning its
 * `resolvedRect` into a clip boundary for all descendants.
 *
 * The entity must already have a {@link UiTransformEcsComponent}.  Clip rects
 * are propagated (intersected) down the hierarchy by the layout system.
 *
 * @param world - The ECS world that owns the entity.
 * @param entity - The entity to mark as a clip region.
 * @param options - Optional configuration.
 */
export function createUiClip(
  world: EcsWorld,
  entity: number,
  options: CreateUiClipOptions = {},
): void {
  if (!world.getComponent(entity, uiTransformId)) {
    throw new Error(
      `Entity "${entity}" must have a UiTransformEcsComponent before adding a clip region.`,
    );
  }

  const { enabled } = { ...defaultCreateUiClipOptions, ...options };

  world.addComponent(entity, uiClipId, { enabled });
}

/**
 * Computes the intersection of two axis-aligned rects.
 * Returns `null` if they do not overlap.
 *
 * @param a - First rect.
 * @param b - Second rect.
 * @returns The overlapping rect, or `null`.
 */
export function intersectRects(a: Rect, b: Rect): Rect | null {
  const x1 = Math.max(a.origin.x, b.origin.x);
  const y1 = Math.max(a.origin.y, b.origin.y);
  const x2 = Math.min(a.origin.x + a.size.x, b.origin.x + b.size.x);
  const y2 = Math.min(a.origin.y + a.size.y, b.origin.y + b.size.y);

  if (x2 <= x1 || y2 <= y1) {
    return null;
  }

  return new Rect(new Vector2(x1, y1), new Vector2(x2 - x1, y2 - y1));
}
