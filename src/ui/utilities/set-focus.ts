import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vector2 } from '../../math/index.js';
import { uiFocusId } from '../components/ui-focus-component.js';
import { uiFocusableId } from '../components/ui-focusable-component.js';
import { uiPointerStateId } from '../components/ui-pointer-state-component.js';
import { uiStateId } from '../components/ui-state-component.js';

/**
 * Moves keyboard focus within a UI canvas to `targetEntity`.
 *
 * Steps:
 * 1. Raises `onBlur` on the previously-focused entity and clears its `focused` flag.
 * 2. Updates {@link UiFocusEcsComponent} on `canvasEntity`.
 * 3. Raises `onFocus` on `targetEntity` and sets its `focused` flag.
 * 4. Sets `focusRing` to `true` for keyboard-sourced focus, `false` for pointer.
 *
 * Passing `null` as `targetEntity` removes focus without granting it elsewhere.
 *
 * @param world - The ECS world.
 * @param canvasEntity - The UI canvas root entity that owns the focus tracker.
 * @param targetEntity - Entity to focus, or `null` to clear focus.
 * @param source - Whether the focus change originated from a pointer or keyboard.
 */
export function setFocus(
  world: EcsWorld,
  canvasEntity: number,
  targetEntity: number | null,
  source: 'pointer' | 'keyboard',
): void {
  const focusComp = world.getComponent(canvasEntity, uiFocusId);

  if (!focusComp) {
    return;
  }

  const previousEntity = focusComp.focused;

  if (previousEntity === targetEntity) {
    return;
  }

  const pointerState = world.getComponent(canvasEntity, uiPointerStateId);
  const pointer = pointerState?.pointer ?? Vector2.zero;

  // Blur the previously-focused entity.
  if (previousEntity !== null) {
    const prevState = world.getComponent(previousEntity, uiStateId);

    if (prevState?.focused) {
      prevState.focused = false;
      prevState.onBlur.raise({ entity: previousEntity, pointer, source });
    }
  }

  focusComp.focused = targetEntity;
  focusComp.focusRing = source === 'keyboard';

  if (targetEntity === null) {
    return;
  }

  // Validate that the target is still focusable before granting focus.
  const focusable = world.getComponent(targetEntity, uiFocusableId);

  if (focusable != null && !focusable.focusable) {
    focusComp.focused = null;

    return;
  }

  const newState = world.getComponent(targetEntity, uiStateId);

  if (newState != null) {
    newState.focused = true;
    newState.onFocus.raise({ entity: targetEntity, pointer, source });
  }
}
