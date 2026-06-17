import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { InputManager } from '../../input/input-manager.js';
import { Vector2 } from '../../math/index.js';
import { uiCanvasId } from '../components/ui-canvas-component.js';
import { uiFocusableId } from '../components/ui-focusable-component.js';
import {
  UiPointerStateEcsComponent,
  uiPointerStateId,
} from '../components/ui-pointer-state-component.js';
import {
  UiStateEcsComponent,
  uiStateId,
} from '../components/ui-state-component.js';
import { UiInteractionEvent } from '../types/index.js';
import { setFocus } from '../utilities/set-focus.js';

/** Name of the HoldAction that tracks the primary pointer button. */
export const uiPrimaryPressActionName = 'ui.primaryPress';

/**
 * Per-frame context shared from `beforeQuery` to each `run` call.
 * Null when no canvas with a pointer state component is found.
 */
interface StateSystemContext {
  canvasEntity: number;
  pointer: Vector2;
  hovered: number | null;
  pressStarted: boolean;
  pressEnded: boolean;
  /** Entity that received (or is receiving) the current press. */
  pressedEntity: number | null;
}

const canvasBuffer: number[] = [];

/**
 * Creates the UI element-state ECS system (Feature F4.2).
 *
 * The system derives per-element hover / press / focus / disabled state
 * transitions from the pointer state written by {@link createUiHitTestEcsSystem}
 * and from the `ui.primaryPress` {@link HoldAction}:
 *
 * - **Hover enter/exit** — fires when the `hovered` entity identity changes.
 * - **Press start** — fires on button-down over the hovered element; sets `pressed`.
 * - **Press end** — fires on button-up; `onClick` fires only if the pointer
 *   is still over the same element that received press-start.
 * - **Disabled short-circuit** — a disabled element never hovers, presses,
 *   or focuses; its state flags remain unchanged and no events are emitted.
 * - **Focus on click** — clicking a {@link UiFocusableEcsComponent} entity
 *   automatically calls {@link setFocus} (source `'pointer'`).
 *
 * **State machine design decision:** explicit transition functions are used
 * instead of the existing FSM module. Hover, press, focus and disabled are
 * orthogonal flags rather than mutually-exclusive states; mapping them to a
 * single FSM would require enumerating the full Cartesian product of states,
 * making the FSM significantly harder to read and test than the equivalent
 * flat boolean logic here.
 *
 * @param inputManager - The input manager used to read `ui.primaryPress`.
 * @returns The element-state ECS system.
 */
export const createUiStateEcsSystem = (
  inputManager: InputManager,
): EcsSystem<[UiStateEcsComponent], StateSystemContext | null> => {
  let prevHeld = false;
  let pressedEntity: number | null = null;

  return {
    query: [uiStateId],

    beforeQuery: (world: EcsWorld): StateSystemContext | null => {
      world.queryEntities([uiCanvasId, uiPointerStateId], canvasBuffer);

      if (canvasBuffer.length === 0) {
        return null;
      }

      const canvasEntity = canvasBuffer[0];
      const pointerState = world.getComponent<UiPointerStateEcsComponent>(
        canvasEntity,
        uiPointerStateId,
      );

      if (!pointerState) {
        return null;
      }

      let isHeld = false;

      try {
        isHeld = inputManager.getHoldAction(uiPrimaryPressActionName).isHeld;
      } catch {
        // Action not registered; treat as not held.
      }

      const pressStarted = isHeld && !prevHeld;
      const pressEnded = !isHeld && prevHeld;
      prevHeld = isHeld;

      if (pressStarted) {
        pressedEntity = pointerState.hovered;
      }

      const currentPressed = pressedEntity;

      if (pressEnded) {
        pressedEntity = null;
      }

      pointerState.pressed = isHeld ? currentPressed : null;

      return {
        canvasEntity,
        pointer: pointerState.pointer,
        hovered: pointerState.hovered,
        pressStarted,
        pressEnded,
        pressedEntity: currentPressed,
      };
    },

    run: (result, world: EcsWorld, ctx: StateSystemContext | null): void => {
      if (!ctx) {
        return;
      }

      const entity = result.entity;
      const [state] = result.components;

      const {
        pointer,
        hovered,
        pressStarted,
        pressEnded,
        pressedEntity: pressed,
      } = ctx;
      const isHovered = hovered === entity;
      const isPressedEntity = pressed === entity;

      const event = (
        source: UiInteractionEvent['source'],
      ): UiInteractionEvent => ({
        entity,
        pointer,
        source,
      });

      // ── Disabled short-circuit ───────────────────────────────────────────
      if (state.disabled) {
        return;
      }

      // ── Hover transitions ────────────────────────────────────────────────
      if (isHovered && !state.hovered) {
        state.hovered = true;
        state.onHoverEnter.raise(event('pointer'));
      } else if (!isHovered && state.hovered) {
        state.hovered = false;
        state.onHoverExit.raise(event('pointer'));
      }

      // ── Press start ──────────────────────────────────────────────────────
      if (pressStarted && isPressedEntity) {
        state.pressed = true;
        state.onPressStart.raise(event('pointer'));

        // Pointer-click focuses focusable elements.
        const focusable = world.getComponent(entity, uiFocusableId);

        if (focusable?.focusable) {
          setFocus(world, ctx.canvasEntity, entity, 'pointer');
        }
      }

      // ── Press end ────────────────────────────────────────────────────────
      if (pressEnded && isPressedEntity && state.pressed) {
        state.pressed = false;
        state.onPressEnd.raise(event('pointer'));

        // Click only completes if the pointer is still over this element.
        if (isHovered) {
          state.onClick.raise(event('pointer'));
        }
      }
    },
  };
};
