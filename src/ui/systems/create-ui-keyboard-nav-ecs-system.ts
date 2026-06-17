import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { InputManager } from '../../input/input-manager.js';
import { Vector2 } from '../../math/index.js';
import {
  UiCanvasEcsComponent,
  uiCanvasId,
} from '../components/ui-canvas-component.js';
import { uiFocusId } from '../components/ui-focus-component.js';
import {
  UiFocusableEcsComponent,
  uiFocusableId,
} from '../components/ui-focusable-component.js';
import { uiInputId } from '../components/ui-input-component.js';
import { uiPointerStateId } from '../components/ui-pointer-state-component.js';
import {
  UiStateEcsComponent,
  uiStateId,
} from '../components/ui-state-component.js';
import { uiTransformId } from '../components/ui-transform-component.js';
import { UiInteractionEvent } from '../types/index.js';
import { setFocus } from '../utilities/set-focus.js';
import { uiInputActionNames } from '../utilities/register-ui-input-actions.js';

const focusableBuffer: number[] = [];

/**
 * Collects all focusable, enabled UI entities sorted by tab order.
 * Ties in `tabIndex` are broken by entity id (stable, reproducible ordering).
 */
function buildTabOrder(world: EcsWorld): number[] {
  world.queryEntities([uiFocusableId], focusableBuffer);

  return focusableBuffer
    .filter((e) => {
      const f = world.getComponent<UiFocusableEcsComponent>(e, uiFocusableId);

      return f?.focusable === true;
    })
    .sort((a, b) => {
      const fa = world.getComponent<UiFocusableEcsComponent>(a, uiFocusableId);
      const fb = world.getComponent<UiFocusableEcsComponent>(b, uiFocusableId);
      const diff = (fa?.tabIndex ?? 0) - (fb?.tabIndex ?? 0);

      return diff !== 0 ? diff : a - b;
    });
}

/**
 * Finds the nearest focusable entity in a given direction using the centre of
 * each entity's `resolvedRect`. Only entities in the forward hemisphere of the
 * direction vector are considered (dot product > 0).
 */
function findSpatialNeighbour(
  world: EcsWorld,
  currentEntity: number,
  direction: Vector2,
  candidates: number[],
): number | null {
  const currentTransform = world.getComponent(currentEntity, uiTransformId);

  if (!currentTransform) {
    return null;
  }

  const cx =
    currentTransform.resolvedRect.origin.x +
    currentTransform.resolvedRect.size.x * 0.5;
  const cy =
    currentTransform.resolvedRect.origin.y +
    currentTransform.resolvedRect.size.y * 0.5;

  let bestEntity: number | null = null;
  let bestDist = Infinity;

  for (const candidate of candidates) {
    if (candidate === currentEntity) {
      continue;
    }

    const t = world.getComponent(candidate, uiTransformId);

    if (!t) {
      continue;
    }

    const tx = t.resolvedRect.origin.x + t.resolvedRect.size.x * 0.5;
    const ty = t.resolvedRect.origin.y + t.resolvedRect.size.y * 0.5;
    const dx = tx - cx;
    const dy = ty - cy;

    if (dx * direction.x + dy * direction.y <= 0) {
      continue;
    }

    const dist = Math.hypot(dx, dy);

    if (dist < bestDist) {
      bestDist = dist;
      bestEntity = candidate;
    }
  }

  return bestEntity;
}

function activateElement(
  world: EcsWorld,
  canvasEntity: number,
  inputManager: InputManager,
): void {
  try {
    if (
      !inputManager.getTriggerAction(uiInputActionNames.activate).isTriggered
    ) {
      return;
    }
  } catch {
    return;
  }

  const focusComp = world.getComponent(canvasEntity, uiFocusId);
  const focused = focusComp?.focused ?? null;

  if (focused === null) {
    return;
  }

  // Input boxes handle Enter themselves — skip keyboard nav activation.
  if (world.getComponent(focused, uiInputId) !== null) {
    return;
  }

  const state = world.getComponent<UiStateEcsComponent>(focused, uiStateId);

  if (state == null || state.disabled) {
    return;
  }

  const pointerState = world.getComponent(canvasEntity, uiPointerStateId);
  const ev: UiInteractionEvent = {
    entity: focused,
    pointer: pointerState?.pointer ?? Vector2.zero,
    source: 'keyboard',
  };

  state.pressed = true;
  state.onPressStart.raise(ev);
  state.pressed = false;
  state.onPressEnd.raise(ev);
  state.onClick.raise(ev);
}

function navigateByTab(
  world: EcsWorld,
  canvasEntity: number,
  inputManager: InputManager,
): boolean {
  try {
    if (
      !inputManager.getTriggerAction(uiInputActionNames.focusNext).isTriggered
    ) {
      return false;
    }
  } catch {
    return false;
  }

  const tabOrder = buildTabOrder(world);

  if (tabOrder.length === 0) {
    return true;
  }

  const focusComp = world.getComponent(canvasEntity, uiFocusId);
  let shiftHeld = false;

  try {
    shiftHeld = inputManager.getHoldAction(uiInputActionNames.shift).isHeld;
  } catch {
    // shift action not registered
  }

  const currentIndex =
    focusComp?.focused != null ? tabOrder.indexOf(focusComp.focused) : -1;

  let nextIndex: number;

  if (shiftHeld) {
    nextIndex = currentIndex <= 0 ? tabOrder.length - 1 : currentIndex - 1;
  } else {
    nextIndex = currentIndex >= tabOrder.length - 1 ? 0 : currentIndex + 1;
  }

  setFocus(world, canvasEntity, tabOrder[nextIndex] ?? null, 'keyboard');

  return true;
}

interface SpatialDirection {
  name: string;
  dir: Vector2;
}

const spatialDirections: SpatialDirection[] = [
  { name: uiInputActionNames.navigateUp, dir: Vector2.up },
  { name: uiInputActionNames.navigateDown, dir: Vector2.down },
  { name: uiInputActionNames.navigateLeft, dir: Vector2.left },
  { name: uiInputActionNames.navigateRight, dir: Vector2.right },
];

function findNextFocusInDirection(
  world: EcsWorld,
  canvasEntity: number,
  dir: Vector2,
  tabOrder: number[],
): number | null {
  const focusComp = world.getComponent(canvasEntity, uiFocusId);
  const currentFocused = focusComp?.focused ?? null;

  if (currentFocused !== null) {
    const spatial = findSpatialNeighbour(world, currentFocused, dir, tabOrder);

    if (spatial !== null) {
      return spatial;
    }
  }

  const currentIndex =
    currentFocused !== null ? tabOrder.indexOf(currentFocused) : -1;
  const nextIndex = currentIndex >= tabOrder.length - 1 ? 0 : currentIndex + 1;

  return tabOrder[nextIndex] ?? null;
}

function navigateSpatially(
  world: EcsWorld,
  canvasEntity: number,
  inputManager: InputManager,
): void {
  // Input boxes use arrow keys for caret movement — skip spatial nav when
  // an input box has focus.
  const focusComp = world.getComponent(canvasEntity, uiFocusId);
  const focused = focusComp?.focused ?? null;

  if (focused !== null && world.getComponent(focused, uiInputId) !== null) {
    return;
  }

  for (const { name, dir } of spatialDirections) {
    try {
      if (!inputManager.getTriggerAction(name).isTriggered) {
        continue;
      }
    } catch {
      continue;
    }

    const tabOrder = buildTabOrder(world);

    if (tabOrder.length === 0) {
      return;
    }

    const nextEntity = findNextFocusInDirection(
      world,
      canvasEntity,
      dir,
      tabOrder,
    );

    setFocus(world, canvasEntity, nextEntity, 'keyboard');

    return;
  }
}

/**
 * Creates the UI keyboard navigation ECS system (Feature F4.5).
 *
 * The system reads the following actions registered by
 * {@link registerUiInputActions}:
 *
 * - **`ui.focusNext`** (Tab) — advance focus; when `ui.shift` is held, reverse
 *   (Shift+Tab). Both directions wrap around.
 * - **`ui.navigateUp/Down/Left/Right`** (Arrow keys) — spatial nearest-neighbour
 *   navigation using `resolvedRect` centres. Falls back to tab-order when no
 *   candidate is found in the requested direction.
 * - **`ui.activate`** (Enter / Space) — fires `onPressStart`, `onPressEnd`, and
 *   `onClick` on the focused element (source `'keyboard'`).
 * - **`ui.cancel`** (Escape) — clears focus.
 *
 * All actions are in the `'ui'` input group and only fire when that group is
 * active, preventing interference with gameplay bindings.
 *
 * @param inputManager - The input manager used to read UI nav actions.
 * @returns The keyboard navigation ECS system.
 */
export const createUiKeyboardNavEcsSystem = (
  inputManager: InputManager,
): EcsSystem<[UiCanvasEcsComponent]> => ({
  query: [uiCanvasId],

  run: (result, world: EcsWorld): void => {
    const canvasEntity = result.entity;

    activateElement(world, canvasEntity, inputManager);

    try {
      if (
        inputManager.getTriggerAction(uiInputActionNames.cancel).isTriggered
      ) {
        setFocus(world, canvasEntity, null, 'keyboard');
      }
    } catch {
      // action not registered
    }

    if (navigateByTab(world, canvasEntity, inputManager)) {
      return;
    }

    navigateSpatially(world, canvasEntity, inputManager);
  },
});
