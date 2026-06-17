import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { InputManager } from '../../input/input-manager.js';
import {
  UiDropdownEcsComponent,
  uiDropdownId,
} from '../components/ui-dropdown-component.js';
import { uiFocusableId } from '../components/ui-focusable-component.js';
import { uiFocusId } from '../components/ui-focus-component.js';
import { uiPointerStateId } from '../components/ui-pointer-state-component.js';
import { uiRenderableId } from '../components/ui-renderable-component.js';
import { uiInteractableId } from '../components/ui-interactable-component.js';
import { uiTransformId } from '../components/ui-transform-component.js';
import { uiInputActionNames } from '../utilities/register-ui-input-actions.js';
import { setFocus } from '../utilities/set-focus.js';

/**
 * Reads a trigger action by name safely; returns `false` when not registered.
 */
function tryTrigger(inputManager: InputManager, name: string): boolean {
  try {
    return inputManager.getTriggerAction(name).isTriggered;
  } catch {
    return false;
  }
}

/**
 * Sets `enabled` on the popup renderable and all option renderables,
 * and updates pointer-blocking on the popup interactable.
 */
function setPopupVisible(
  world: EcsWorld,
  dropdown: UiDropdownEcsComponent,
  visible: boolean,
): void {
  const popupRenderable = world.getComponent(
    dropdown.popupEntity,
    uiRenderableId,
  );

  if (popupRenderable) {
    popupRenderable.enabled = visible;
  }

  const popupInteractable = world.getComponent(
    dropdown.popupEntity,
    uiInteractableId,
  );

  if (popupInteractable) {
    popupInteractable.enabled = visible;
  }

  for (const optEntity of dropdown.optionEntities) {
    const optRenderable = world.getComponent(optEntity, uiRenderableId);

    if (optRenderable) {
      optRenderable.enabled = visible;
    }

    const optFocusable = world.getComponent(optEntity, uiFocusableId);

    if (optFocusable) {
      optFocusable.focusable = visible;
    }

    const optInteractable = world.getComponent(optEntity, uiInteractableId);

    if (optInteractable) {
      optInteractable.enabled = visible;
    }
  }
}

/**
 * Repositions the popup panel below the trigger button based on the
 * trigger's resolved rect.
 */
function repositionPopup(
  world: EcsWorld,
  dropdown: UiDropdownEcsComponent,
): void {
  const triggerTransform = world.getComponent(
    dropdown.triggerEntity,
    uiTransformId,
  );
  const popupTransform = world.getComponent(
    dropdown.popupEntity,
    uiTransformId,
  );

  if (!triggerTransform || !popupTransform) {
    return;
  }

  const triggerRect = triggerTransform.resolvedRect;
  const popupHeight = popupTransform.offsetMax.y - popupTransform.offsetMin.y;

  popupTransform.offsetMin.x = triggerRect.origin.x;
  popupTransform.offsetMin.y = triggerRect.origin.y + triggerRect.size.y;
  popupTransform.offsetMax.x = triggerRect.origin.x + triggerRect.size.x;
  popupTransform.offsetMax.y =
    triggerRect.origin.y + triggerRect.size.y + popupHeight;
  popupTransform.isDirty = true;
}

/** Returns whether the hovered entity belongs to the dropdown (popup, trigger, or an option). */
function isHoveredInsideDropdown(
  hovered: number | null,
  dropdown: UiDropdownEcsComponent,
): boolean {
  if (hovered === null) {
    return false;
  }

  return (
    hovered === dropdown.popupEntity ||
    hovered === dropdown.triggerEntity ||
    dropdown.optionEntities.includes(hovered)
  );
}

/**
 * Checks click-away and focus-escape conditions; sets `isOpen = false` when
 * the user has clicked or focused outside the popup.
 */
function checkWhileOpenConditions(
  world: EcsWorld,
  dropdown: UiDropdownEcsComponent,
  inputManager: InputManager,
): void {
  if (tryTrigger(inputManager, uiInputActionNames.cancel)) {
    dropdown.isOpen = false;

    return;
  }

  const pointerState = world.getComponent(
    dropdown.canvasEntity,
    uiPointerStateId,
  );

  if (!pointerState) {
    return;
  }

  let pressHeld = false;

  try {
    pressHeld = inputManager.getHoldAction(
      uiInputActionNames.primaryPress,
    ).isHeld;
  } catch {
    // action not registered
  }

  if (pressHeld && !isHoveredInsideDropdown(pointerState.hovered, dropdown)) {
    dropdown.isOpen = false;

    return;
  }

  const focusComp = world.getComponent(dropdown.canvasEntity, uiFocusId);
  const focused = focusComp?.focused ?? null;

  if (focused === null) {
    return;
  }

  const isPopupFocused =
    focused === dropdown.popupEntity ||
    focused === dropdown.triggerEntity ||
    dropdown.optionEntities.includes(focused);

  if (!isPopupFocused) {
    dropdown.isOpen = false;
  }
}

/**
 * Creates the UI dropdown ECS system (Feature F7.3).
 *
 * The system drives open/close transitions for each
 * {@link UiDropdownEcsComponent} in the world:
 *
 * **On open (`isOpen` becomes `true`):**
 * 1. Repositions the popup panel below the trigger's resolved rect.
 * 2. Enables renderables and interactables on the popup and all option buttons.
 * 3. Sets `focusable = true` on option buttons so they are reachable by tab / arrow keys.
 * 4. Moves keyboard focus to the currently selected option button.
 * 5. Raises `onOpen`.
 *
 * **On close (`isOpen` becomes `false`):**
 * 1. Disables renderables and interactables on the popup and option buttons.
 * 2. Sets `focusable = false` on option buttons.
 * 3. Returns keyboard focus to the trigger button.
 * 4. Raises `onClose`.
 *
 * **While open (each frame):**
 * - **Click-away**: if a pointer press started and `pointerState.hovered` is
 *   not the popup or trigger entity, closes the dropdown.
 * - **Escape (`ui.cancel`)**: closes the dropdown and returns focus to the trigger.
 *
 * @param inputManager - The input manager to read UI actions from.
 * @returns The dropdown ECS system.
 */
export const createUiDropdownEcsSystem = (
  inputManager: InputManager,
): EcsSystem<[UiDropdownEcsComponent]> => {
  const prevIsOpen = new Map<number, boolean>();

  return {
    query: [uiDropdownId],

    run: (result, world: EcsWorld): void => {
      const entity = result.entity;
      const [dropdown] = result.components;

      const wasOpen = prevIsOpen.get(entity) ?? false;
      const isOpen = dropdown.isOpen;

      // ── Transition: closed → open ────────────────────────────────────

      if (!wasOpen && isOpen) {
        repositionPopup(world, dropdown);
        setPopupVisible(world, dropdown, true);

        if (dropdown.optionEntities.length > 0) {
          const selectedOpt =
            dropdown.optionEntities[dropdown.selectedIndex] ??
            dropdown.optionEntities[0];
          setFocus(world, dropdown.canvasEntity, selectedOpt, 'keyboard');
        }

        dropdown.onOpen.raise();
        prevIsOpen.set(entity, true);

        return;
      }

      // ── Transition: open → closed ────────────────────────────────────

      if (wasOpen && !isOpen) {
        setPopupVisible(world, dropdown, false);
        setFocus(
          world,
          dropdown.canvasEntity,
          dropdown.triggerEntity,
          'keyboard',
        );
        dropdown.onClose.raise();
        prevIsOpen.set(entity, false);

        return;
      }

      // ── While open ───────────────────────────────────────────────────

      if (!isOpen) {
        return;
      }

      checkWhileOpenConditions(world, dropdown, inputManager);
    },
  };
};
