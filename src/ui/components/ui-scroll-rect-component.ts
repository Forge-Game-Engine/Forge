import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { ParameterizedForgeEvent } from '../../events/index.js';
import { Rect, Rects, Vec2, Vector2 } from '../../math/index.js';
import { withDefaults } from '../../utilities/with-defaults.js';

/**
 * How a {@link UiScrollRectEcsComponent} treats the content's edges.
 * `'elastic'` lets a drag pull the content past an edge, resisting more the
 * further it goes, and springs it back on release. `'clamped'` stops the
 * content at its edges.
 */
export type UiScrollMovementType = 'elastic' | 'clamped';

/** The entities making up one of a scroll rect's scrollbars. */
export interface UiScrollbar {
  /**
   * The scrollbar's track: a child of the scroll rect with a
   * `RectTransformEcsComponent` and a `UiInteractableEcsComponent`. Pressing
   * the handle drags it; pressing the track elsewhere moves the handle there.
   */
  track: number;

  /**
   * The handle: a child of `track` whose `RectTransformEcsComponent` is
   * stretched along the scrollbar (`x` for a horizontal scrollbar, `y` for a
   * vertical one). `createUiScrollRectEcsSystem` writes that axis's
   * `anchorMin`/`anchorMax`, so the handle's length shows how much of the
   * content is visible and its position how far it's scrolled.
   */
  handle: number;
}

/**
 * A {@link UiScrollbar} plus the drag state `createUiScrollRectEcsSystem`
 * keeps for it.
 */
export interface UiScrollbarState extends UiScrollbar {
  /**
   * While the track is pressed, how far the pointer is from the handle's
   * center along the scrollbar, in reference pixels, so the handle doesn't
   * jump under the pointer: `0` when the press landed on the track outside
   * the handle. `null` while the track isn't pressed. System-owned.
   */
  grabOffset: number | null;
}

/**
 * Fields of {@link UiScrollRectEcsComponent} with no sensible default;
 * callers must always provide these.
 */
export interface UiScrollRectRequiredOptions {
  /**
   * The entity that scrolls: a direct child of the scroll rect whose
   * `RectTransformEcsComponent` is anchored and pivoted at its top-left
   * corner (`x` a point axis at `0` with pivot `0`, or a stretch axis from
   * `0` with pivot `0`; `y` a point axis at `1` with pivot `1`, or a stretch
   * axis up to `1` with pivot `1`), so `offset` `(0, 0)` lines its top-left
   * corner up with the scroll rect's. Give it a layout group and a
   * `ContentSizeFitterEcsComponent` to size it to its children.
   * `createUiScrollRectEcsSystem` owns its `anchoredPosition`.
   */
  content: number;
}

/**
 * Fields of {@link UiScrollRectEcsComponent} with a sensible default, or
 * that are genuinely optional (no default at all); callers may omit these.
 */
export interface UiScrollRectDefaultedOptions {
  /**
   * Whether the content can scroll horizontally. It only does when it's
   * wider than the scroll rect. Defaults to `true`.
   */
  horizontal: boolean;

  /**
   * Whether the content can scroll vertically. It only does when it's
   * taller than the scroll rect. Defaults to `true`.
   */
  vertical: boolean;

  /** How the content's edges behave. Defaults to `'elastic'`. */
  movementType: UiScrollMovementType;

  /**
   * How long, in seconds, elastic content takes to spring back after being
   * dragged past an edge. Defaults to `0.1`.
   */
  elasticity: number;

  /**
   * The fraction of its speed the content keeps after one second of
   * coasting once a drag is released. `0` stops it as soon as the drag ends.
   * Defaults to `0.135`.
   */
  decelerationRate: number;

  /**
   * How far the content has moved from its rest position, in reference
   * pixels, Y-up. At `(0, 0)` the content's top-left corner is at the
   * scroll rect's top-left corner. Scrolling down a list moves the content
   * up, so `y` grows from `0` to the content's hidden height; scrolling
   * right moves it left, so `x` falls from `0` to minus its hidden width.
   * An elastic drag takes it past those bounds until it springs back.
   * Written by dragging, the mouse wheel, the scrollbars and focus moving
   * to a control inside the content; game code may also write it, e.g.
   * `offset.y = 0` to go back to the top, and `denormalizeUiScrollOffset`
   * converts a `0`-`1` position to an offset.
   */
  offset: Vector2;

  /** The horizontal scrollbar, if there is one. */
  horizontalScrollbar?: UiScrollbar;

  /** The vertical scrollbar, if there is one. */
  verticalScrollbar?: UiScrollbar;
}

/**
 * A rect whose content scrolls: dragged with the pointer, turned with the
 * mouse wheel, coasting after a release (inertia), springing back from past
 * its edges (elasticity), and moved by optional scrollbars. The scroll rect
 * entity is the viewport: give it a `RectTransformEcsComponent`, a rect
 * `MaskEcsComponent` so the content is clipped to it, and a
 * `UiInteractableEcsComponent` with `receivesDrag` (so a drag starting on a
 * button in the content scrolls it) and `focusable: false` (so it doesn't
 * take focus from the controls inside it). `createScrollView` builds the
 * whole assembly.
 *
 * When focus moves to a control inside the content by navigation, the
 * content scrolls just far enough to show it.
 */
export interface UiScrollRectEcsComponent
  extends
    UiScrollRectRequiredOptions,
    Omit<
      UiScrollRectDefaultedOptions,
      'horizontalScrollbar' | 'verticalScrollbar'
    > {
  /** The horizontal scrollbar and its drag state, if there is one. */
  horizontalScrollbar?: UiScrollbarState;

  /** The vertical scrollbar and its drag state, if there is one. */
  verticalScrollbar?: UiScrollbarState;

  /**
   * The content's current speed, in reference pixels per second, the same
   * direction as `offset`. Set from the pointer while dragging and decaying
   * by `decelerationRate` afterwards. System-owned, written by
   * `createUiScrollRectEcsSystem`; read-only to callers.
   */
  velocity: Vector2;

  /**
   * While the scroll rect is being dragged, the pointer's position (in its
   * canvas's UI world space) and `offset` when the drag began; `null`
   * otherwise. System-owned bookkeeping.
   */
  dragOrigin: { pointer: Vector2; offset: Vector2 } | null;

  /**
   * The canvas's focused entity as of the last tick, so the system can tell
   * when focus moves. System-owned bookkeeping.
   */
  lastFocusedEntity: number | null;

  /** Raised whenever `offset` changes, with the new offset. */
  readonly onValueChanged: ParameterizedForgeEvent<Vector2>;
}

export const uiScrollRectId =
  createComponentId<UiScrollRectEcsComponent>('uiScrollRect');

const defaultUiScrollRectOptions: Omit<
  UiScrollRectDefaultedOptions,
  'offset' | 'horizontalScrollbar' | 'verticalScrollbar'
> = {
  horizontal: true,
  vertical: true,
  movementType: 'elastic',
  elasticity: 0.1,
  decelerationRate: 0.135,
};

/**
 * Attaches a {@link UiScrollRectEcsComponent} to `entity`, the scroll rect's
 * viewport. Needs a `UiInteractableEcsComponent` and a
 * `RectTransformEcsComponent` on the same entity for
 * `createUiScrollRectEcsSystem` to process it.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the scroll rect. `content` has
 * no sensible default and must always be provided.
 * @returns The attached component, for reading or writing `offset`, or
 * listening to `onValueChanged`.
 */
export function addUiScrollRectComponent(
  world: EcsWorld,
  entity: number,
  options: UiScrollRectRequiredOptions & Partial<UiScrollRectDefaultedOptions>,
): UiScrollRectEcsComponent {
  const { horizontalScrollbar, verticalScrollbar, offset, ...rest } =
    withDefaults(defaultUiScrollRectOptions, options);

  const component: UiScrollRectEcsComponent = {
    ...rest,
    offset: offset ? Vec2.clone(offset) : Vec2.zero,
    ...(horizontalScrollbar && {
      horizontalScrollbar: { ...horizontalScrollbar, grabOffset: null },
    }),
    ...(verticalScrollbar && {
      verticalScrollbar: { ...verticalScrollbar, grabOffset: null },
    }),
    velocity: Vec2.zero,
    dragOrigin: null,
    lastFocusedEntity: null,
    onValueChanged: new ParameterizedForgeEvent('uiScrollRect.onValueChanged'),
  };

  return world.addComponent(entity, uiScrollRectId, component);
}

/**
 * How far content can scroll on each axis: how much wider and taller it is
 * than the viewport, or `0` on an axis it fits.
 * @param viewport - The scroll rect's resolved rect.
 * @param content - The content's resolved rect.
 * @returns The hidden width (`x`) and height (`y`), in reference pixels.
 */
export function computeUiScrollRange(viewport: Rect, content: Rect): Vector2 {
  const viewportSize = Rects.size(viewport);
  const contentSize = Rects.size(content);

  return {
    x: Math.max(0, contentSize.x - viewportSize.x),
    y: Math.max(0, contentSize.y - viewportSize.y),
  };
}

/**
 * Converts a scroll rect's `offset` to a `0`-`1` position on each axis:
 * `x` `0` at the left edge and `1` at the right, `y` `1` at the top and `0`
 * at the bottom (Y-up). Outside `0`-`1` while elastic content is pulled
 * past an edge. On an axis the content fits, `x` is `0` and `y` is `1`.
 * @param offset - The scroll rect's `offset`.
 * @param range - The scroll range, from {@link computeUiScrollRange}.
 * @returns The normalized position.
 */
export function normalizeUiScrollOffset(
  offset: Vector2,
  range: Vector2,
): Vector2 {
  return {
    x: range.x > 0 ? (0 - offset.x) / range.x : 0,
    y: range.y > 0 ? 1 - offset.y / range.y : 1,
  };
}

/**
 * Converts a `0`-`1` position (see {@link normalizeUiScrollOffset}) back to
 * an `offset`.
 * @param normalizedPosition - The normalized position.
 * @param range - The scroll range, from {@link computeUiScrollRange}.
 * @returns The offset.
 */
export function denormalizeUiScrollOffset(
  normalizedPosition: Vector2,
  range: Vector2,
): Vector2 {
  return {
    x: 0 - normalizedPosition.x * range.x,
    y: (1 - normalizedPosition.y) * range.y,
  };
}
