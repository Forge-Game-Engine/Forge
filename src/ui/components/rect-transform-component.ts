import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Rect, Rects, Vec2, Vector2 } from '../../math/index.js';
import { UiAxis } from '../types/ui-axis.js';

/**
 * Fields of {@link RectTransformEcsComponent} with a sensible default;
 * callers may omit these.
 */
export interface RectTransformDefaultedOptions {
  /**
   * This element's horizontal anchoring. A `UiPointAxis` (`anchorMin.x ==
   * anchorMax.x`) keeps a literal `size` and moves with the anchor; a
   * `UiStretchAxis` resizes with the parent's width, with `margin` added to
   * the anchored span. See `UiAnchor` for common `x`/`y` presets, and
   * `UiAxis`'s own `point`/`stretch` factories for building one directly.
   */
  x: UiAxis;

  /** This element's vertical anchoring - see `x`. */
  y: UiAxis;

  /**
   * Offset of this element's pivot from its anchor reference point, in
   * reference pixels (UI world units).
   */
  anchoredPosition: Vector2;

  /**
   * The resolved rect, in UI world space. Written every frame by
   * `createUiLayoutEcsSystem` from `x`/`y`/`anchoredPosition` and the
   * parent's own resolved rect - do not set this directly, it's overwritten
   * on the next layout pass.
   */
  rect: Rect;

  /**
   * This element's hierarchy pre-order index within its canvas, written
   * every frame by `createUiLayoutEcsSystem` - the same value it writes
   * into `SpriteEcsComponent.sortDepth`/`TextEcsComponent.sortDepth` for
   * elements that have one, so draw order follows hierarchy order within a
   * canvas rather than world Y. Elements with neither still get one here,
   * since `createUiRaycastEcsSystem` needs a topmost-first ordering for
   * every interactable regardless of whether it happens to draw anything.
   * Do not set this directly.
   */
  sortDepth: number;
}

export type RectTransformEcsComponent = RectTransformDefaultedOptions;

export const rectTransformId =
  createComponentId<RectTransformEcsComponent>('rectTransform');

/**
 * Attaches a {@link RectTransformEcsComponent} to `entity`. Every UI
 * element - including a `CanvasEcsComponent`'s own root entity - has one;
 * `createUiLayoutEcsSystem` resolves it against its parent's rect (or, for a
 * canvas root, the canvas's reference resolution) every frame.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the rect transform. See
 * `UiAnchor` for common `x`/`y` presets.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addRectTransformComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<RectTransformDefaultedOptions> = {},
): RectTransformEcsComponent {
  const defaultRectTransformOptions: RectTransformDefaultedOptions = {
    x: UiAxis.point(0.5),
    y: UiAxis.point(0.5),
    anchoredPosition: Vec2.zero,
    rect: Rects.zero,
    sortDepth: 0,
  };

  const merged = { ...defaultRectTransformOptions, ...options };

  const component: RectTransformEcsComponent = {
    // `x`/`y` are shallow-cloned (rather than referenced directly) since a
    // `UiAnchor` preset value can be reused across several
    // `addRectTransformComponent` calls - cloning means one entity's later
    // in-place axis mutation (e.g. a slider dragging its handle) can never
    // corrupt another entity built from the same preset value. `Vector2`s
    // are cloned for the same reason.
    x: { ...merged.x },
    y: { ...merged.y },
    anchoredPosition: Vec2.clone(merged.anchoredPosition),
    rect: Rects.clone(merged.rect),
    sortDepth: merged.sortDepth,
  };

  return world.addComponent(entity, rectTransformId, component);
}
