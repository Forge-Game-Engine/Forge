import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { InputManager } from '../../input/input-manager.js';
import { clamp } from '../../math/index.js';
import { uiCanvasId } from '../components/ui-canvas-component.js';
import { parentId } from '../../common/components/parent-component.js';
import { uiFocusId } from '../components/ui-focus-component.js';
import { uiPointerStateId } from '../components/ui-pointer-state-component.js';
import {
  UiScrollEcsComponent,
  uiScrollId,
} from '../components/ui-scroll-component.js';
import { uiStateId } from '../components/ui-state-component.js';
import { uiTransformId } from '../components/ui-transform-component.js';
import { uiInputActionNames } from '../utilities/register-ui-input-actions.js';

const canvasBuffer: number[] = [];

/**
 * Clamps the scroll offset to its valid range given content and viewport sizes.
 */
function clampScroll(
  value: number,
  contentDim: number,
  viewportDim: number,
): number {
  return clamp(value, 0, Math.max(0, contentDim - viewportDim));
}

/**
 * Applies the current scroll offset to the content entity's transform.
 * The content entity uses an offset-based stretch in the primary axis
 * so that setting offsetMin.y = -scrollY moves all content up.
 */
function applyScrollToContent(
  world: EcsWorld,
  scroll: UiScrollEcsComponent,
): void {
  const contentTransform = world.getComponent(
    scroll.contentEntity,
    uiTransformId,
  );

  if (!contentTransform) {
    return;
  }

  const { orientation } = scroll;

  if (orientation === 'vertical' || orientation === 'both') {
    contentTransform.offsetMin.y = -scroll.scroll.y;
    contentTransform.offsetMax.y = scroll.contentSize.y - scroll.scroll.y;
  }

  if (orientation === 'horizontal' || orientation === 'both') {
    contentTransform.offsetMin.x = -scroll.scroll.x;
    contentTransform.offsetMax.x = scroll.contentSize.x - scroll.scroll.x;
  }

  contentTransform.isDirty = true;
}

/**
 * Updates the scrollbar thumb position based on the current scroll offset.
 */
function applyScrollbarThumb(
  world: EcsWorld,
  scroll: UiScrollEcsComponent,
): void {
  const { thumbEntity, scrollbarEntity } = scroll;

  if (thumbEntity === undefined || scrollbarEntity === undefined) {
    return;
  }

  const trackTransform = world.getComponent(scrollbarEntity, uiTransformId);
  const thumbTransform = world.getComponent(thumbEntity, uiTransformId);

  if (!trackTransform || !thumbTransform) {
    return;
  }

  const trackHeight = trackTransform.resolvedRect.size.y;
  const contentHeight = scroll.contentSize.y;
  const viewportHeight = scroll.viewportSize.y;

  if (contentHeight <= viewportHeight || contentHeight <= 0) {
    // No scrolling needed — hide thumb or fill full track
    thumbTransform.offsetMin.y = 0;
    thumbTransform.offsetMax.y = trackHeight;
    thumbTransform.isDirty = true;

    return;
  }

  const ratio = viewportHeight / contentHeight;
  const thumbHeight = Math.max(20, trackHeight * ratio);
  const maxThumbOffset = trackHeight - thumbHeight;
  const scrollRatio = scroll.scroll.y / (contentHeight - viewportHeight);
  const thumbOffset = scrollRatio * maxThumbOffset;

  thumbTransform.offsetMin.y = thumbOffset;
  thumbTransform.offsetMax.y = thumbOffset + thumbHeight;
  thumbTransform.isDirty = true;
}

/**
 * Computes the scroll adjustment needed to make a rect visible within the
 * viewport. Returns the delta to add to the current scroll value.
 */
function ensureVisibleDelta(
  itemMin: number,
  itemMax: number,
  viewportMin: number,
  viewportMax: number,
): number {
  if (itemMin < viewportMin) {
    return itemMin - viewportMin;
  }

  if (itemMax > viewportMax) {
    return itemMax - viewportMax;
  }

  return 0;
}

/**
 * Checks whether `descendant` is in the subtree rooted at `ancestor` by
 * walking up the parent chain.
 */
function isDescendantOf(
  world: EcsWorld,
  descendant: number,
  ancestor: number,
): boolean {
  let current = descendant;

  // Walk up at most 64 levels to avoid infinite loops on malformed trees.
  for (let i = 0; i < 64; i++) {
    const parentComp = world.getComponent(current, parentId);

    if (!parentComp) {
      return false;
    }

    if (parentComp.parent === ancestor) {
      return true;
    }

    current = parentComp.parent;
  }

  return false;
}

/**
 * Scrolls the group to ensure the focused entity is visible within the
 * viewport. Only adjusts if the focused entity is a descendant of the
 * content entity.
 */
function handleEnsureVisible(
  world: EcsWorld,
  viewportEntity: number,
  scroll: UiScrollEcsComponent,
): void {
  world.queryEntities([uiCanvasId], canvasBuffer);

  if (canvasBuffer.length === 0) {
    return;
  }

  const focusComp = world.getComponent(canvasBuffer[0], uiFocusId);
  const focusedEntity = focusComp?.focused ?? null;

  if (focusedEntity === null) {
    return;
  }

  if (!isDescendantOf(world, focusedEntity, scroll.contentEntity)) {
    return;
  }

  const focusedTransform = world.getComponent(focusedEntity, uiTransformId);
  const viewportTransform = world.getComponent(viewportEntity, uiTransformId);

  if (!focusedTransform || !viewportTransform) {
    return;
  }

  const focusedRect = focusedTransform.resolvedRect;
  const viewportRect = viewportTransform.resolvedRect;

  const { orientation } = scroll;
  let changed = false;

  if (orientation === 'vertical' || orientation === 'both') {
    const delta = ensureVisibleDelta(
      focusedRect.origin.y,
      focusedRect.origin.y + focusedRect.size.y,
      viewportRect.origin.y,
      viewportRect.origin.y + viewportRect.size.y,
    );

    if (delta !== 0) {
      scroll.scroll.y = clampScroll(
        scroll.scroll.y + delta,
        scroll.contentSize.y,
        scroll.viewportSize.y,
      );
      changed = true;
    }
  }

  if (orientation === 'horizontal' || orientation === 'both') {
    const delta = ensureVisibleDelta(
      focusedRect.origin.x,
      focusedRect.origin.x + focusedRect.size.x,
      viewportRect.origin.x,
      viewportRect.origin.x + viewportRect.size.x,
    );

    if (delta !== 0) {
      scroll.scroll.x = clampScroll(
        scroll.scroll.x + delta,
        scroll.contentSize.x,
        scroll.viewportSize.x,
      );
      changed = true;
    }
  }

  if (changed) {
    applyScrollToContent(world, scroll);
    applyScrollbarThumb(world, scroll);
  }
}

/**
 * Handles scrollbar thumb drag-to-scroll interaction.
 */
function handleThumbDrag(
  world: EcsWorld,
  scroll: UiScrollEcsComponent,
  pointerY: number,
  prevPointerY: number,
): boolean {
  const { thumbEntity, scrollbarEntity } = scroll;

  if (thumbEntity === undefined || scrollbarEntity === undefined) {
    return false;
  }

  const thumbState = world.getComponent(thumbEntity, uiStateId);

  if (!thumbState?.pressed) {
    return false;
  }

  const trackTransform = world.getComponent(scrollbarEntity, uiTransformId);

  if (!trackTransform) {
    return false;
  }

  const trackHeight = trackTransform.resolvedRect.size.y;
  const contentHeight = scroll.contentSize.y;
  const viewportHeight = scroll.viewportSize.y;

  if (trackHeight <= 0 || contentHeight <= viewportHeight) {
    return false;
  }

  const pointerDelta = pointerY - prevPointerY;
  const scrollDelta = (pointerDelta / trackHeight) * contentHeight;

  scroll.scroll.y = clampScroll(
    scroll.scroll.y + scrollDelta,
    contentHeight,
    viewportHeight,
  );

  return true;
}

/**
 * Context passed from `beforeQuery` to each `run` invocation.
 */
interface ScrollSystemContext {
  canvasEntity: number;
  hovered: number | null;
  pointerX: number;
  pointerY: number;
  prevPointerY: number;
  scrollDelta: number;
}

/**
 * Creates the UI scroll ECS system (Feature F7.1).
 *
 * The system drives mouse-wheel scrolling, scrollbar thumb drag, and keyboard
 * ensure-visible for all entities with {@link UiScrollEcsComponent}. Add it to
 * the world **after** the layout system.
 *
 * Wheel scrolling:
 * - The `ui.scrollY` {@link Axis1dAction} carries the wheel delta (positive =
 *   scroll down). The pointer must be over the viewport entity for wheel input
 *   to apply to that scroll group.
 *
 * Scrollbar drag:
 * - When the thumb is pressed and dragged, the drag delta is mapped to a scroll
 *   delta proportional to `(contentSize - viewportSize) / trackHeight`.
 *
 * Ensure-visible:
 * - When the focused entity is a descendant of the content entity and its
 *   `resolvedRect` is outside the viewport, scroll adjusts to bring it in view.
 *   Runs every frame so it responds to layout changes and new focus.
 *
 * @param inputManager - The input manager used to read `ui.scrollY`.
 * @returns The scroll ECS system.
 */
export const createUiScrollEcsSystem = (
  inputManager: InputManager,
): EcsSystem<[UiScrollEcsComponent], ScrollSystemContext | null> => {
  let prevPointerY = 0;

  return {
    query: [uiScrollId],

    beforeQuery: (world: EcsWorld): ScrollSystemContext | null => {
      world.queryEntities([uiCanvasId, uiPointerStateId], canvasBuffer);

      if (canvasBuffer.length === 0) {
        return null;
      }

      const canvasEntity = canvasBuffer[0];
      const pointerState = world.getComponent(canvasEntity, uiPointerStateId);

      if (!pointerState) {
        return null;
      }

      let scrollDelta = 0;

      try {
        scrollDelta = inputManager.getAxis1dAction(
          uiInputActionNames.scrollY,
        ).value;
      } catch {
        // action not registered
      }

      const ctx: ScrollSystemContext = {
        canvasEntity,
        hovered: pointerState.hovered,
        pointerX: pointerState.pointer.x,
        pointerY: pointerState.pointer.y,
        prevPointerY,
        scrollDelta,
      };

      prevPointerY = pointerState.pointer.y;

      return ctx;
    },

    run: (result, world: EcsWorld, ctx: ScrollSystemContext | null): void => {
      if (!ctx) {
        return;
      }

      const viewportEntity = result.entity;
      const [scroll] = result.components;

      // Sync viewport size from resolved rect
      const viewportTransform = world.getComponent(
        viewportEntity,
        uiTransformId,
      );

      if (viewportTransform) {
        scroll.viewportSize.x = viewportTransform.resolvedRect.size.x;
        scroll.viewportSize.y = viewportTransform.resolvedRect.size.y;
      }

      const prevScroll = scroll.scroll.clone();

      // ── Wheel scrolling ───────────────────────────────────────────────

      if (ctx.scrollDelta !== 0 && ctx.hovered === viewportEntity) {
        const { orientation } = scroll;

        if (orientation === 'vertical' || orientation === 'both') {
          scroll.scroll.y = clampScroll(
            scroll.scroll.y + ctx.scrollDelta * 40,
            scroll.contentSize.y,
            scroll.viewportSize.y,
          );
        }

        if (orientation === 'horizontal' || orientation === 'both') {
          scroll.scroll.x = clampScroll(
            scroll.scroll.x + ctx.scrollDelta * 40,
            scroll.contentSize.x,
            scroll.viewportSize.x,
          );
        }
      }

      // ── Scrollbar thumb drag ──────────────────────────────────────────

      handleThumbDrag(world, scroll, ctx.pointerY, ctx.prevPointerY);

      // ── Apply to content ──────────────────────────────────────────────

      applyScrollToContent(world, scroll);
      applyScrollbarThumb(world, scroll);

      // ── Ensure focused child is visible ───────────────────────────────

      handleEnsureVisible(world, viewportEntity, scroll);

      // ── Hide scrollbar thumb when renderable is null ──────────────────
      // (scrollbar entities exist only when showScrollbar was true)

      // ── Fire onScroll if changed ──────────────────────────────────────

      if (
        scroll.scroll.x !== prevScroll.x ||
        scroll.scroll.y !== prevScroll.y
      ) {
        scroll.onScroll.raise({
          entity: viewportEntity,
          scroll: scroll.scroll.clone(),
        });
      }
    },
  };
};
