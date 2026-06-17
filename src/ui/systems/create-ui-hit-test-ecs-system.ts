import { EcsSystem, SystemRegistrationOrder } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { InputManager } from '../../input/input-manager.js';
import {
  UiCanvasEcsComponent,
  uiCanvasId,
} from '../components/ui-canvas-component.js';
import {
  UiInteractableEcsComponent,
  uiInteractableId,
} from '../components/ui-interactable-component.js';
import { uiPointerStateId } from '../components/ui-pointer-state-component.js';
import {
  UiRenderableEcsComponent,
  uiRenderableId,
} from '../components/ui-renderable-component.js';
import {
  UiTransformEcsComponent,
  uiTransformId,
} from '../components/ui-transform-component.js';
import { pointInUiElement } from '../utilities/point-in-ui-element.js';

/** Name of the Axis2dAction that tracks absolute pointer position. */
export const uiPointerActionName = 'ui.pointer';

const interactableBuffer: number[] = [];

function getZIndex(world: EcsWorld, entity: number): number {
  const r = world.getComponent<UiRenderableEcsComponent>(
    entity,
    uiRenderableId,
  );

  return r?.zIndex ?? 0;
}

/**
 * Creates the UI pointer hit-test ECS system (Feature F4.1).
 *
 * Each frame the system:
 * 1. Reads the current pointer position from the `ui.pointer` {@link Axis2dAction}
 *    (absolute CSS pixels, container-relative).
 * 2. Tests all {@link UiInteractableEcsComponent} entities against their
 *    `resolvedRect` / `worldMatrix` (inverse transform for rotated elements)
 *    and the propagated `clipRect`.
 * 3. Resolves overlaps by `zIndex` (topmost wins) and stops at the first
 *    `blocksPointer` entity.
 * 4. Writes the result into the {@link UiPointerStateEcsComponent} on every
 *    UI canvas root entity.
 *
 * **Registration:** add with an order between {@link SystemRegistrationOrder.early}
 * and `normal` so it runs after input is updated but before the state system.
 * The exported constant {@link uiHitTestSystemOrder} provides a suitable value.
 *
 * @param inputManager - The input manager used to read the pointer action.
 * @returns The hit-test ECS system.
 */
export const createUiHitTestEcsSystem = (
  inputManager: InputManager,
): EcsSystem<[UiCanvasEcsComponent], void> => ({
  query: [uiCanvasId],

  beforeQuery: (world: EcsWorld): void => {
    world.queryEntities([uiInteractableId, uiTransformId], interactableBuffer);
  },

  run: (result, world) => {
    const canvasEntity = result.entity;
    const pointerState = world.getComponent(canvasEntity, uiPointerStateId);

    if (!pointerState) {
      return;
    }

    // Read absolute pointer position from the registered axis action.
    let pointerX = 0;
    let pointerY = 0;

    try {
      const pointerAction = inputManager.getAxis2dAction(uiPointerActionName);
      pointerX = pointerAction.value.x;
      pointerY = pointerAction.value.y;
    } catch {
      // Action not registered; leave pointer at (0,0).
    }

    pointerState.pointer.x = pointerX;
    pointerState.pointer.y = pointerY;

    const pointer = pointerState.pointer;

    // Sort descending by zIndex so the topmost element is tested first.
    interactableBuffer.sort(
      (a, b) => getZIndex(world, b) - getZIndex(world, a),
    );

    let hovered: number | null = null;

    for (const entity of interactableBuffer) {
      const interactable = world.getComponent<UiInteractableEcsComponent>(
        entity,
        uiInteractableId,
      );

      if (!interactable?.enabled) {
        continue;
      }

      const transform = world.getComponent<UiTransformEcsComponent>(
        entity,
        uiTransformId,
      );

      if (!transform) {
        continue;
      }

      if (pointInUiElement(pointer, transform, interactable.hitPadding ?? 0)) {
        hovered = entity;

        if (interactable.blocksPointer) {
          break;
        }
      }
    }

    pointerState.hovered = hovered;
  },
});

/**
 * Recommended registration order for the hit-test system.
 * Sits between `early` (input update) and `normal` (state system) so pointer
 * state is ready before state transitions are computed.
 */
export const uiHitTestSystemOrder = SystemRegistrationOrder.early + 5_000;
