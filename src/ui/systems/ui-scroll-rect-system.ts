import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { clamp, lerp, Rect, Rects, Vec2, Vector2 } from '../../math/index.js';
import { RenderContext } from '../../rendering/index.js';
import {
  CanvasEcsComponent,
  canvasId,
} from '../components/canvas-component.js';
import {
  RectTransformEcsComponent,
  rectTransformId,
} from '../components/rect-transform-component.js';
import {
  UiInteractableEcsComponent,
  uiInteractableId,
} from '../components/ui-interactable-component.js';
import {
  computeUiScrollRange,
  denormalizeUiScrollOffset,
  normalizeUiScrollOffset,
  UiScrollbarState,
  UiScrollRectEcsComponent,
  uiScrollRectId,
} from '../components/ui-scroll-rect-component.js';
import { UiAxis } from '../types/ui-axis.js';
import { UiPointerSource } from '../types/ui-pointer-source.js';
import { findOwningCanvas } from '../utilities/find-owning-canvas.js';
import { resolveCanvasPointerPosition } from '../utilities/resolve-canvas-pointer-position.js';

type Axis = 'x' | 'y';

const axes: readonly Axis[] = ['x', 'y'];

/** Below this speed, in reference pixels per second, coasting content stops. */
const minimumSpeed = 1;

/**
 * Within this distance of its edge, in reference pixels, springing-back
 * content settles on the edge instead of creeping towards it.
 */
const settleDistance = 0.1;

/** Everything one scroll rect's update needs, resolved once per tick. */
interface ScrollContext {
  world: EcsWorld;
  entity: number;
  scrollRect: UiScrollRectEcsComponent;
  interactable: UiInteractableEcsComponent;
  viewport: Rect;
  content: RectTransformEcsComponent;
  canvas: CanvasEcsComponent | null;
  pointer: Vector2 | null;
  range: Vector2;
  scrollable: Record<Axis, boolean>;
  deltaTime: number;
  renderContext: RenderContext;
}

/** The `offset` bounds on one axis: content scrolls left (`x` falls) and up (`y` grows). */
function boundsOf(axis: Axis, range: Vector2): { min: number; max: number } {
  return axis === 'x' ? { min: -range.x, max: 0 } : { min: 0, max: range.y };
}

/**
 * How far an elastic drag moves content that's `overshoot` past an edge:
 * less and less the further it's pulled, never more than `viewportSize`.
 */
function rubberBand(overshoot: number, viewportSize: number): number {
  return (
    (1 - 1 / ((Math.abs(overshoot) * 0.55) / viewportSize + 1)) *
    viewportSize *
    Math.sign(overshoot)
  );
}

/**
 * Moves `current` towards `target` like a critically damped spring that
 * settles in about `smoothTime` seconds, without overshooting, updating
 * `velocity` (the standard game-engine smooth damp).
 */
function smoothDamp(
  current: number,
  target: number,
  velocity: number,
  smoothTime: number,
  deltaTime: number,
): { value: number; velocity: number } {
  const omega = 2 / Math.max(0.0001, smoothTime);
  const x = omega * deltaTime;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp = (velocity + omega * change) * deltaTime;
  const value = target + (change + temp) * decay;

  if (target - current > 0 === value > target) {
    return { value: target, velocity: 0 };
  }

  return { value, velocity: (velocity - omega * temp) * decay };
}

/**
 * Throws unless `content`'s top-left corner rests at its parent's top-left
 * corner when its `anchoredPosition` is zero, which is what lets `offset`
 * be written straight into `anchoredPosition`.
 */
function assertTopLeftAnchored(content: RectTransformEcsComponent): void {
  const { x, y } = content;
  const xAtLeft =
    x.pivot === 0 && (x.kind === 'point' ? x.anchor : x.anchorMin) === 0;
  const yAtTop =
    y.pivot === 1 && (y.kind === 'point' ? y.anchor : y.anchorMax) === 1;

  if (!xAtLeft || !yAtTop) {
    throw new Error(
      "A scroll rect's content must be anchored and pivoted at its top-left corner (x anchored at 0 with pivot 0, y anchored at 1 with pivot 1), e.g. UiAnchor.stretchTopLeft for a vertical list or UiAnchor.topLeft.",
    );
  }
}

/** The nearest scroll rect at or above `entity`, or `null`. */
function findNearestScrollRect(world: EcsWorld, entity: number): number | null {
  for (
    let current: number | null = entity;
    current !== null;
    current = world.getParent(current)
  ) {
    if (world.getComponent(current, uiScrollRectId) !== null) {
      return current;
    }

    if (world.getComponent(current, canvasId) !== null) {
      return null;
    }
  }

  return null;
}

function isDescendantOf(
  world: EcsWorld,
  entity: number,
  ancestor: number,
): boolean {
  for (
    let current = world.getParent(entity);
    current !== null;
    current = world.getParent(current)
  ) {
    if (current === ancestor) {
      return true;
    }
  }

  return false;
}

/**
 * When focus has just moved to a control inside the content by navigation
 * (not by the pointer hovering it, and not during a drag), scrolls just far
 * enough to show it, the way a list follows a gamepad cursor. Runs against
 * the rects the layout resolved this tick, so it reads the content's current
 * `anchoredPosition` rather than `offset`, which game code may have changed
 * since.
 */
function scrollFocusIntoView(context: ScrollContext): void {
  const { world, entity, scrollRect, canvas, viewport, content } = context;
  const focused = canvas?.focusedEntity ?? null;

  if (focused === scrollRect.lastFocusedEntity) {
    return;
  }

  scrollRect.lastFocusedEntity = focused;

  if (
    focused === null ||
    focused === canvas?.hoveredEntity ||
    context.interactable.isDragging ||
    !isDescendantOf(world, focused, scrollRect.content) ||
    findNearestScrollRect(world, focused) !== entity
  ) {
    return;
  }

  const focusedRect = world.getComponent<RectTransformEcsComponent>(
    focused,
    rectTransformId,
  )?.rect;

  if (!focusedRect) {
    return;
  }

  for (const axis of axes) {
    if (!context.scrollable[axis]) {
      continue;
    }

    // Content moving towards +axis moves the focused rect with it.
    let shift = 0;

    if (focusedRect.max[axis] > viewport.max[axis]) {
      shift = viewport.max[axis] - focusedRect.max[axis];
    }

    if (focusedRect.min[axis] + shift < viewport.min[axis]) {
      shift = viewport.min[axis] - focusedRect.min[axis];
    }

    if (shift !== 0) {
      const bounds = boundsOf(axis, context.range);

      scrollRect.offset[axis] = clamp(
        content.anchoredPosition[axis] + shift,
        bounds.min,
        bounds.max,
      );
      scrollRect.velocity[axis] = 0;
    }
  }
}

/**
 * Moves the content with a scrollbar's handle while its track is pressed.
 * @returns Whether the scrollbar is being dragged.
 */
function applyScrollbarDrag(
  context: ScrollContext,
  scrollbar: UiScrollbarState | undefined,
  axis: Axis,
): boolean {
  if (!scrollbar) {
    return false;
  }

  const { world, scrollRect, pointer, range } = context;
  const track = world.getComponent<UiInteractableEcsComponent>(
    scrollbar.track,
    uiInteractableId,
  );
  const trackRect = world.getComponent<RectTransformEcsComponent>(
    scrollbar.track,
    rectTransformId,
  )?.rect;
  const handleRect = world.getComponent<RectTransformEcsComponent>(
    scrollbar.handle,
    rectTransformId,
  )?.rect;

  if (!track?.pressCapture || !trackRect || !handleRect || !pointer) {
    scrollbar.grabOffset = null;

    return false;
  }

  if (!context.scrollable[axis]) {
    return true;
  }

  const handleCenter = (handleRect.min[axis] + handleRect.max[axis]) / 2;

  scrollbar.grabOffset ??= Rects.contains(handleRect, pointer)
    ? pointer[axis] - handleCenter
    : 0;

  const handleLength = handleRect.max[axis] - handleRect.min[axis];
  const freeLength = trackRect.max[axis] - trackRect.min[axis] - handleLength;

  if (freeLength <= 0) {
    return true;
  }

  const t = clamp(
    (pointer[axis] -
      scrollbar.grabOffset -
      trackRect.min[axis] -
      handleLength / 2) /
      freeLength,
    0,
    1,
  );
  const normalized = normalizeUiScrollOffset(scrollRect.offset, range);

  normalized[axis] = t;
  scrollRect.offset[axis] = denormalizeUiScrollOffset(normalized, range)[axis];
  scrollRect.velocity[axis] = 0;

  return true;
}

/**
 * Moves the content with the pointer while the scroll rect is dragged,
 * pulling elastic content past an edge with resistance, and tracks its
 * velocity for coasting after the release.
 * @returns Whether the scroll rect is being dragged.
 */
function applyContentDrag(context: ScrollContext): boolean {
  const { scrollRect, interactable, pointer, viewport, deltaTime } = context;

  if (!interactable.isDragging || !pointer) {
    scrollRect.dragOrigin = null;

    return false;
  }

  scrollRect.dragOrigin ??= {
    pointer: Vec2.clone(pointer),
    offset: Vec2.clone(scrollRect.offset),
  };

  const viewportSize = Rects.size(viewport);

  for (const axis of axes) {
    if (!context.scrollable[axis]) {
      continue;
    }

    const bounds = boundsOf(axis, context.range);
    const dragged =
      scrollRect.dragOrigin.offset[axis] +
      pointer[axis] -
      scrollRect.dragOrigin.pointer[axis];
    const clamped = clamp(dragged, bounds.min, bounds.max);
    const next =
      scrollRect.movementType === 'elastic'
        ? clamped + rubberBand(dragged - clamped, viewportSize[axis])
        : clamped;

    if (deltaTime > 0) {
      const frameVelocity = (next - scrollRect.offset[axis]) / deltaTime;

      scrollRect.velocity[axis] = lerp(
        scrollRect.velocity[axis],
        frameVelocity,
        Math.min(1, deltaTime * 10),
      );
    }

    scrollRect.offset[axis] = next;
  }

  return true;
}

/**
 * Scrolls by the mouse wheel when the pointer is over this scroll rect and
 * no nearer scroll rect: the content moves the same on-screen distance the
 * browser would scroll a page, stopping at its edges. A vertical wheel
 * scrolls content that only scrolls horizontally.
 */
function applyWheel(
  context: ScrollContext,
  pointerSource: UiPointerSource,
): void {
  const { world, entity, canvas, scrollRect, scrollable } = context;
  const { scroll, position } = pointerSource;

  if (
    (scroll.x === 0 && scroll.y === 0) ||
    !canvas ||
    canvas.hoveredEntity === null ||
    findNearestScrollRect(world, canvas.hoveredEntity) !== entity
  ) {
    return;
  }

  const screenDelta =
    scrollable.x && !scrollable.y && Math.abs(scroll.y) > Math.abs(scroll.x)
      ? { x: scroll.y, y: 0 }
      : scroll;
  const from = context.pointer;
  const to = resolveCanvasPointerPosition(
    world,
    canvas,
    context.renderContext,
    Vec2.add(Vec2.clone(position), screenDelta),
  );

  if (!from || !to) {
    return;
  }

  for (const axis of axes) {
    if (!scrollable[axis]) {
      continue;
    }

    const bounds = boundsOf(axis, context.range);

    // The pointer's content moves against the wheel: turning it down moves
    // the content up.
    scrollRect.offset[axis] = clamp(
      scrollRect.offset[axis] - (to[axis] - from[axis]),
      bounds.min,
      bounds.max,
    );
    scrollRect.velocity[axis] = 0;
  }
}

/** Springs elastic content that's past an edge back towards `edge`. */
function springBack(
  scrollRect: UiScrollRectEcsComponent,
  axis: Axis,
  edge: number,
  deltaTime: number,
): void {
  const damped = smoothDamp(
    scrollRect.offset[axis],
    edge,
    scrollRect.velocity[axis],
    scrollRect.elasticity,
    deltaTime,
  );
  const isSettled = Math.abs(damped.value - edge) < settleDistance;

  scrollRect.offset[axis] = isSettled ? edge : damped.value;
  scrollRect.velocity[axis] =
    isSettled || Math.abs(damped.velocity) < minimumSpeed ? 0 : damped.velocity;
}

/**
 * Moves released content on by its velocity, slowing it by
 * `decelerationRate`, and stops clamped content at its edges.
 */
function coast(
  scrollRect: UiScrollRectEcsComponent,
  axis: Axis,
  bounds: { min: number; max: number },
  deltaTime: number,
): void {
  let velocity =
    scrollRect.velocity[axis] *
    Math.pow(scrollRect.decelerationRate, deltaTime);

  if (Math.abs(velocity) < minimumSpeed) {
    velocity = 0;
  }

  const next = scrollRect.offset[axis] + velocity * deltaTime;
  const clampedNext = clamp(next, bounds.min, bounds.max);

  if (scrollRect.movementType === 'clamped' && clampedNext !== next) {
    scrollRect.offset[axis] = clampedNext;
    scrollRect.velocity[axis] = 0;

    return;
  }

  scrollRect.offset[axis] = next;
  scrollRect.velocity[axis] = velocity;
}

/**
 * After a release: springs elastic content back inside its edges, or lets
 * it coast and slow down by `decelerationRate`.
 */
function applyRelease(context: ScrollContext): void {
  const { scrollRect, deltaTime } = context;

  if (deltaTime <= 0) {
    return;
  }

  for (const axis of axes) {
    if (!context.scrollable[axis]) {
      continue;
    }

    const bounds = boundsOf(axis, context.range);
    const offset = scrollRect.offset[axis];
    const edge = clamp(offset, bounds.min, bounds.max);

    if (scrollRect.movementType === 'elastic' && edge !== offset) {
      springBack(scrollRect, axis, edge, deltaTime);
    } else {
      coast(scrollRect, axis, bounds, deltaTime);
    }
  }
}

/** Sizes and places a scrollbar's handle along its track from the scroll position. */
function applyScrollbarHandle(
  context: ScrollContext,
  scrollbar: UiScrollbarState | undefined,
  axis: Axis,
): void {
  if (!scrollbar) {
    return;
  }

  const handle = context.world.getComponentRequired<RectTransformEcsComponent>(
    scrollbar.handle,
    rectTransformId,
  );
  const handleAxis: UiAxis = handle[axis];

  if (handleAxis.kind !== 'stretch') {
    throw new Error(
      `A scroll rect's scrollbar handle must be stretched along its scrollbar's axis ("${axis}"), so its anchors can show the visible part of the content.`,
    );
  }

  const viewportSize = Rects.size(context.viewport)[axis];
  const contentSize = Rects.size(context.content.rect)[axis];
  const visible =
    context.range[axis] > 0 && contentSize > 0 ? viewportSize / contentSize : 1;
  const position = clamp(
    normalizeUiScrollOffset(context.scrollRect.offset, context.range)[axis],
    0,
    1,
  );

  handleAxis.anchorMin = (1 - visible) * position;
  handleAxis.anchorMax = handleAxis.anchorMin + visible;
}

/**
 * Resolves everything one scroll rect's update needs, checking its content
 * is a direct child anchored at its top-left corner.
 */
function buildScrollContext(
  world: EcsWorld,
  entity: number,
  scrollRect: UiScrollRectEcsComponent,
  interactable: UiInteractableEcsComponent,
  viewport: Rect,
  services: {
    pointerSource: UiPointerSource;
    renderContext: RenderContext;
    time: Time;
  },
): ScrollContext {
  const { pointerSource, renderContext, time } = services;
  const content = world.getComponentRequired<RectTransformEcsComponent>(
    scrollRect.content,
    rectTransformId,
  );

  if (world.getParent(scrollRect.content) !== entity) {
    throw new Error(
      `A scroll rect's content (entity ${scrollRect.content}) must be a direct child of the scroll rect (entity ${entity}).`,
    );
  }

  assertTopLeftAnchored(content);

  const range = computeUiScrollRange(viewport, content.rect);
  const canvasEntity = findOwningCanvas(world, entity);
  const canvas =
    canvasEntity !== null
      ? world.getComponent<CanvasEcsComponent>(canvasEntity, canvasId)
      : null;

  return {
    world,
    entity,
    scrollRect,
    interactable,
    viewport,
    content,
    canvas,
    pointer: canvas
      ? resolveCanvasPointerPosition(
          world,
          canvas,
          renderContext,
          pointerSource.position,
        )
      : null,
    range,
    scrollable: {
      x: scrollRect.horizontal && range.x > 0,
      y: scrollRect.vertical && range.y > 0,
    },
    deltaTime: time.deltaTimeInSeconds,
    renderContext,
  };
}

/**
 * Pins axes that can't scroll at `0`, writes `offset` into the content's
 * `anchoredPosition`, updates the scrollbar handles and raises
 * `onValueChanged` if `offset` changed this tick.
 */
function applyOffset(context: ScrollContext, previousOffset: Vector2): void {
  const { scrollRect } = context;

  for (const axis of axes) {
    if (!context.scrollable[axis]) {
      scrollRect.offset[axis] = 0;
      scrollRect.velocity[axis] = 0;
    }
  }

  context.content.anchoredPosition = Vec2.clone(scrollRect.offset);

  applyScrollbarHandle(context, scrollRect.horizontalScrollbar, 'x');
  applyScrollbarHandle(context, scrollRect.verticalScrollbar, 'y');

  if (!Vec2.equals(previousOffset, scrollRect.offset)) {
    scrollRect.onValueChanged.raise(Vec2.clone(scrollRect.offset));
  }
}

/**
 * Creates a system that scrolls every `UiScrollRectEcsComponent`'s content.
 * Each tick, per scroll rect, in this order:
 *
 * - If focus just moved to a control inside the content by navigation (not
 *   by the pointer hovering it), scrolls just far enough to show it.
 * - While a scrollbar's track is pressed, moves the content with its handle.
 * - Otherwise, while the scroll rect's `UiInteractableEcsComponent` is
 *   dragging - including a drag that started on a control inside the
 *   content, which `createUiInteractionEcsSystem` hands to it - moves the
 *   content with the pointer, pulling elastic content past an edge with
 *   resistance.
 * - Otherwise, scrolls by the mouse wheel when the pointer is over this
 *   scroll rect and no scroll rect nested inside it, then lets released
 *   content coast and spring back inside its edges.
 *
 * An axis only scrolls when it's enabled and the content is bigger than the
 * scroll rect on it. The system then writes `offset` into the content's
 * `RectTransformEcsComponent.anchoredPosition` (it's the only writer), sizes
 * and places the scrollbar handles, and raises `onValueChanged` if `offset`
 * changed. The layout resolves the new position on the next tick, the same
 * one-frame lag `createUiSliderEcsSystem` has.
 *
 * Must be registered after `createUiInteractionEcsSystem` (it reads
 * `isDragging`, `pressCapture` and `CanvasEcsComponent.hoveredEntity`).
 * `registerUiSystems` does this for you whenever a `pointerSource` is
 * supplied.
 * @param pointerSource - The pointer source dragged against and read for
 * the wheel.
 * @param renderContext - The render context canvases' cameras render
 * through, used to convert the pointer position.
 * @param time - The time instance driving inertia and elasticity.
 * @returns The UI scroll rect ECS system.
 * @throws From `update`: an error if a scroll rect's content isn't its
 * direct child anchored at its top-left corner, or a scrollbar handle isn't
 * stretched along its scrollbar.
 */
export const createUiScrollRectEcsSystem = (
  pointerSource: UiPointerSource,
  renderContext: RenderContext,
  time: Time,
): EcsSystem<
  [
    UiScrollRectEcsComponent,
    UiInteractableEcsComponent,
    RectTransformEcsComponent,
  ]
> => ({
  name: 'uiScrollRect',
  query: [uiScrollRectId, uiInteractableId, rectTransformId],
  update: (
    world,
    { entities, components: [scrollRects, interactables, rectTransforms] },
  ) => {
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const scrollRect = scrollRects[i];
      const context = buildScrollContext(
        world,
        entity,
        scrollRect,
        interactables[i],
        rectTransforms[i].rect,
        { pointerSource, renderContext, time },
      );

      const previousOffset = Vec2.clone(scrollRect.offset);

      scrollFocusIntoView(context);

      const isScrollbarDragged =
        applyScrollbarDrag(context, scrollRect.horizontalScrollbar, 'x') ||
        applyScrollbarDrag(context, scrollRect.verticalScrollbar, 'y');

      if (!isScrollbarDragged && !applyContentDrag(context)) {
        applyWheel(context, pointerSource);
        applyRelease(context);
      }

      applyOffset(context, previousOffset);
    }
  },
});
