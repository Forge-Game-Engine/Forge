import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Rect, Rects, Vec2, Vector2 } from '../../math/index.js';

/**
 * Fields of {@link RectTransformEcsComponent} with a sensible default;
 * callers may omit these.
 */
export interface RectTransformDefaultedOptions {
  /**
   * Normalized lower-left anchor within the parent's rect. `(0, 0)` is the
   * parent's bottom-left corner, `(1, 1)` its top-right. Equal to
   * `anchorMax` for a point anchor (the element keeps its own size and
   * moves with the anchor); different from `anchorMax` for a stretch anchor
   * (the element resizes with the parent). See `UiAnchor` for common
   * presets.
   */
  anchorMin: Vector2;

  /**
   * Normalized upper-right anchor within the parent's rect. Equal to
   * `anchorMin` for a point anchor.
   */
  anchorMax: Vector2;

  /**
   * Normalized origin within this element's own rect - `(0, 0)` is its
   * bottom-left corner, `(1, 1)` its top-right - the point placed at the
   * anchor, and the point sprite/text positioning is expressed relative to.
   */
  pivot: Vector2;

  /**
   * Offset of this element's pivot from its anchor reference point, in
   * reference pixels (UI world units).
   */
  anchoredPosition: Vector2;

  /**
   * Size in reference pixels when point-anchored (`anchorMin == anchorMax`);
   * a margin relative to the anchor rect (added to it) when stretched.
   */
  sizeDelta: Vector2;

  /**
   * The resolved rect, in UI world space. Written every frame by
   * `createUiLayoutEcsSystem` from `anchorMin`/`anchorMax`/`pivot`/
   * `anchoredPosition`/`sizeDelta` and the parent's own resolved rect - do
   * not set this directly, it's overwritten on the next layout pass.
   */
  rect: Rect;
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
 * `UiAnchor` for common `anchorMin`/`anchorMax`/`pivot` presets.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addRectTransformComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<RectTransformDefaultedOptions> = {},
): RectTransformEcsComponent {
  // `Vector2`s are cloned out of `options` (rather than referenced
  // directly) since `UiAnchor`'s presets are shared, module-level objects -
  // holding onto one directly would let mutating one entity's anchor/pivot
  // corrupt every entity built from the same preset.
  const defaultRectTransformOptions: RectTransformDefaultedOptions = {
    anchorMin: { x: 0.5, y: 0.5 },
    anchorMax: { x: 0.5, y: 0.5 },
    pivot: { x: 0.5, y: 0.5 },
    anchoredPosition: Vec2.zero,
    sizeDelta: { x: 100, y: 100 },
    rect: Rects.zero,
  };

  const merged = { ...defaultRectTransformOptions, ...options };

  const component: RectTransformEcsComponent = {
    anchorMin: Vec2.clone(merged.anchorMin),
    anchorMax: Vec2.clone(merged.anchorMax),
    pivot: Vec2.clone(merged.pivot),
    anchoredPosition: Vec2.clone(merged.anchoredPosition),
    sizeDelta: Vec2.clone(merged.sizeDelta),
    rect: Rects.clone(merged.rect),
  };

  return world.addComponent(entity, rectTransformId, component);
}
