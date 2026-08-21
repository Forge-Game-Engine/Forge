import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { mouseButtons } from '../../input/index.js';
import { Vec2, Vector2 } from '../../math/index.js';
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
import { UiPointerSource } from '../types/ui-pointer-source.js';
import { findOwningCanvas } from '../utilities/find-owning-canvas.js';
import { resolveCanvasPointerPosition } from '../utilities/resolve-canvas-pointer-position.js';
import { setUiFocus } from '../utilities/set-ui-focus.js';

const primaryButton = mouseButtons.left;

/** Raises `onPointerEnter`/`onPointerExit` on the hover edge, updates `isHovered`, and applies the "pointer hover also focuses" canvas policy. */
function updateHoverAndFocus(
  world: EcsWorld,
  entity: number,
  interactable: UiInteractableEcsComponent,
  canvas: CanvasEcsComponent | null,
  isOver: boolean,
): void {
  const wasHovered = interactable.isHovered;

  if (isOver && !wasHovered) {
    interactable.onPointerEnter.raise();
  } else if (!isOver && wasHovered) {
    interactable.onPointerExit.raise();
  }

  interactable.isHovered = isOver;

  // Edge-triggered, matching onPointerEnter just above - not level-
  // triggered on `isOver` alone, or a stationary pointer left resting over
  // an element would silently re-focus it on every single tick, fighting
  // (and always winning, since this system runs after navigation) any
  // keyboard/gamepad navigation move made while the pointer hasn't budged.
  if (isOver && !wasHovered && interactable.interactable && canvas) {
    setUiFocus(world, canvas, entity);
  }
}

/** Captures a new press on a down edge landing on this element, if it isn't already capturing one. */
function beginPressIfNeeded(
  interactable: UiInteractableEcsComponent,
  isOver: boolean,
  downEdge: boolean,
  pointerPosition: Vector2 | null,
): void {
  if (
    !downEdge ||
    !isOver ||
    !interactable.interactable ||
    interactable.pressCapture !== null ||
    !pointerPosition
  ) {
    return;
  }

  interactable.pressCapture = { originPosition: Vec2.clone(pointerPosition) };
  interactable.onPointerDown.raise();
}

/** While a press is captured, promotes it to a drag once it exceeds `dragThreshold`, and raises `onDrag` every tick while dragging. */
function updateDragState(
  interactable: UiInteractableEcsComponent,
  pointerPosition: Vector2 | null,
): void {
  if (interactable.pressCapture === null || !pointerPosition) {
    return;
  }

  if (!interactable.isDragging) {
    const distance = Vec2.distanceTo(
      pointerPosition,
      interactable.pressCapture.originPosition,
    );

    if (distance >= interactable.dragThreshold) {
      interactable.isDragging = true;
      interactable.onBeginDrag.raise();
    }
  }

  if (interactable.isDragging) {
    interactable.onDrag.raise();
  }
}

/** Resolves a captured press on the matching up edge: `onInvoke` if released inside without dragging, `onEndDrag` if it was a drag, then always `onPointerUp` and clears the capture. */
function endPressIfNeeded(
  interactable: UiInteractableEcsComponent,
  isOver: boolean,
  upEdge: boolean,
): void {
  if (!upEdge || interactable.pressCapture === null) {
    return;
  }

  if (interactable.isDragging) {
    interactable.onEndDrag.raise();
  } else if (isOver) {
    interactable.wasInvokedThisFrame = true;
    interactable.onInvoke.raise();
  }

  interactable.onPointerUp.raise();
  interactable.pressCapture = null;
  interactable.isDragging = false;
  interactable.isPressed = false;
}

/**
 * Creates a system that runs the pointer interaction state machine over
 * every `UiInteractableEcsComponent`: hover enter/exit, a captured press
 * (from a pointer-down edge on the element until its matching up edge,
 * regardless of whether the pointer stays over it), drag start/move/end
 * once the press exceeds `dragThreshold`, and `onInvoke` on a release
 * inside that didn't turn into a drag.
 *
 * State is derived fresh from each tick's facts (this tick's raycast hit,
 * this tick's button edges) rather than advanced one transition at a time,
 * so a pointer enter-and-press or press-and-release landing in the same
 * tick - which a real pointer source can genuinely report, since edges are
 * only ever sampled once per tick - still resolves correctly instead of
 * silently dropping the click: an enter-and-press tick raises both
 * `onPointerEnter` and `onPointerDown` and goes straight to a captured
 * press without ever being observed as merely hovered, and a
 * press-and-release tick still raises `onInvoke` because the down and up
 * edges are read from separate per-tick sets rather than a single
 * "is held" flag that a same-tick press-then-release would never show as
 * true.
 *
 * Also applies the canvas policy that the pointer hovering an interactable
 * focuses it too (via `setUiFocus`), so the focus highlight follows the
 * mouse the same way it follows gamepad navigation.
 *
 * Must be registered after `createUiRaycastEcsSystem` (it reads
 * `CanvasEcsComponent.hoveredEntity`).
 * @param pointerSource - The pointer source driving this state machine.
 * @param renderContext - The render context canvases' cameras render
 * through, used to convert the pointer position for drag-threshold checks.
 * @returns The UI interaction ECS system.
 */
export const createUiInteractionEcsSystem = (
  pointerSource: UiPointerSource,
  renderContext: RenderContext,
): EcsSystem<[UiInteractableEcsComponent, RectTransformEcsComponent]> => ({
  name: 'uiInteraction',
  query: [uiInteractableId, rectTransformId],
  update: (world, { entities, components: [interactables] }) => {
    const downEdge = pointerSource.buttonsDown.has(primaryButton);
    const upEdge = pointerSource.buttonsUp.has(primaryButton);

    const pointerPositionByCanvas = new Map<number, Vector2 | null>();

    const getPointerPosition = (
      canvasEntity: number,
      canvas: CanvasEcsComponent,
    ): Vector2 | null => {
      let position = pointerPositionByCanvas.get(canvasEntity);

      if (position === undefined) {
        position = resolveCanvasPointerPosition(
          world,
          canvas,
          renderContext,
          pointerSource,
        );
        pointerPositionByCanvas.set(canvasEntity, position);
      }

      return position;
    };

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const interactable = interactables[i];

      const owningCanvasEntity = findOwningCanvas(world, entity);
      const canvas =
        owningCanvasEntity !== null
          ? world.getComponent<CanvasEcsComponent>(owningCanvasEntity, canvasId)
          : null;

      const isOver = canvas !== null && canvas.hoveredEntity === entity;
      const pointerPosition =
        canvas && owningCanvasEntity !== null
          ? getPointerPosition(owningCanvasEntity, canvas)
          : null;

      updateHoverAndFocus(world, entity, interactable, canvas, isOver);
      beginPressIfNeeded(interactable, isOver, downEdge, pointerPosition);
      updateDragState(interactable, pointerPosition);

      interactable.isPressed = interactable.pressCapture !== null && isOver;

      endPressIfNeeded(interactable, isOver, upEdge);
    }
  },
});
