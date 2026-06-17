import {
  actionResetTypes,
  buttonMoments,
  cursorValueTypes,
  mouseButtons,
} from '../../input/constants/index.js';
import { Axis1dAction } from '../../input/actions/axis-1d-action.js';
import { Axis2dAction } from '../../input/actions/axis-2d-action.js';
import { HoldAction } from '../../input/actions/hold-action.js';
import { TriggerAction } from '../../input/actions/trigger-action.js';
import { InputManager } from '../../input/input-manager.js';
import { KeyboardInputSource } from '../../input/keyboard/input-sources/keyboard-input-source.js';
import {
  KeyboardHoldBinding,
  KeyboardTriggerBinding,
} from '../../input/keyboard/bindings/index.js';
import {
  MouseAxis1dBinding,
  MouseAxis2dBinding,
  MouseHoldBinding,
} from '../../input/mouse/bindings/index.js';
import { MouseInputSource } from '../../input/mouse/input-sources/mouse-input-source.js';
import { keyCodes } from '../../input/constants/key-codes.js';
import { Vector2 } from '../../math/index.js';

/** Input group used for all UI actions. */
export const uiInputGroup = 'ui';

/** Canonical action name constants for UI input. */
export const uiInputActionNames = {
  /** Absolute pointer position in CSS pixels (container-relative). */
  pointer: 'ui.pointer',
  /** Primary pointer button (left mouse button). */
  primaryPress: 'ui.primaryPress',
  /** Move focus to next element (Tab). */
  focusNext: 'ui.focusNext',
  /** Shift modifier (ShiftLeft / ShiftRight) — combined with focusNext for Shift+Tab. */
  shift: 'ui.shift',
  /** Ctrl modifier (ControlLeft / ControlRight) — used for word-jump and select-all in input boxes. */
  ctrl: 'ui.ctrl',
  /** Spatial navigation: up (ArrowUp). */
  navigateUp: 'ui.navigateUp',
  /** Spatial navigation: down (ArrowDown). */
  navigateDown: 'ui.navigateDown',
  /** Spatial navigation: left (ArrowLeft). */
  navigateLeft: 'ui.navigateLeft',
  /** Spatial navigation: right (ArrowRight). */
  navigateRight: 'ui.navigateRight',
  /** Activate the focused element (Enter / Space). */
  activate: 'ui.activate',
  /** Dismiss / cancel (Escape). */
  cancel: 'ui.cancel',
  /** Vertical scroll delta from mouse wheel (positive = scroll down). */
  scrollY: 'ui.scrollY',
  /** Delete character before caret (Backspace) — used by input boxes. */
  inputBackspace: 'ui.inputBackspace',
  /** Delete character after caret (Delete) — used by input boxes. */
  inputDelete: 'ui.inputDelete',
  /** Jump caret to start of line / field (Home) — used by input boxes. */
  inputHome: 'ui.inputHome',
  /** Jump caret to end of line / field (End) — used by input boxes. */
  inputEnd: 'ui.inputEnd',
} as const;

/** The set of input actions registered by {@link registerUiInputActions}. */
export interface UiInputActions {
  /**
   * Axis2d action tracking absolute pointer position (CSS pixels).
   * Bind via {@link MouseAxis2dBinding} with `cursorValueType: 'absolute'`.
   */
  pointer: Axis2dAction;
  /** Hold action for the primary pointer button (left mouse button). */
  primaryPress: HoldAction;
  /** Trigger action for forward focus traversal (Tab). */
  focusNext: TriggerAction;
  /** Hold action for the Shift modifier — read alongside `focusNext` for Shift+Tab. */
  shift: HoldAction;
  /** Hold action for the Ctrl modifier — read alongside arrows for word-jump, or A for select-all. */
  ctrl: HoldAction;
  /** Trigger action for upward spatial navigation (ArrowUp). */
  navigateUp: TriggerAction;
  /** Trigger action for downward spatial navigation (ArrowDown). */
  navigateDown: TriggerAction;
  /** Trigger action for leftward spatial navigation (ArrowLeft). */
  navigateLeft: TriggerAction;
  /** Trigger action for rightward spatial navigation (ArrowRight). */
  navigateRight: TriggerAction;
  /** Trigger action to activate the focused element (Enter / Space). */
  activate: TriggerAction;
  /** Trigger action to dismiss or cancel (Escape). */
  cancel: TriggerAction;
  /** Axis1d action for vertical mouse-wheel scroll delta (positive = scroll down). */
  scrollY: Axis1dAction;
  /** Trigger action for Backspace key — used by input boxes to delete before caret. */
  inputBackspace: TriggerAction;
  /** Trigger action for Delete key — used by input boxes to delete after caret. */
  inputDelete: TriggerAction;
  /** Trigger action for Home key — used by input boxes to jump to start. */
  inputHome: TriggerAction;
  /** Trigger action for End key — used by input boxes to jump to end. */
  inputEnd: TriggerAction;
}

/**
 * Options for {@link registerUiInputActions}.
 */
export interface RegisterUiInputActionsOptions {
  /**
   * A {@link MouseInputSource} to wire the default mouse bindings onto.
   * When provided:
   * - `pointer` is bound with `cursorValueType: 'absolute'`
   * - `primaryPress` is bound to the left mouse button
   */
  mouseSource?: MouseInputSource;

  /**
   * A {@link KeyboardInputSource} to wire the default keyboard bindings onto.
   * When provided, Tab / arrows / Enter / Space / Escape are bound.
   */
  keyboardSource?: KeyboardInputSource;
}

/**
 * Registers all UI input actions with the given {@link InputManager} and
 * optionally wires default mouse and keyboard bindings.
 *
 * All actions are placed in the `'ui'` input group. Call
 * `inputManager.setActiveGroup('ui')` to enable UI navigation.
 *
 * The returned {@link UiInputActions} object provides references to every
 * action for custom binding or inspection.
 *
 * @param inputManager - The input manager to register actions with.
 * @param options - Optional sources to attach default bindings to.
 * @returns The registered UI input actions.
 */
export function registerUiInputActions(
  inputManager: InputManager,
  options: RegisterUiInputActionsOptions = {},
): UiInputActions {
  const pointer = new Axis2dAction(
    uiInputActionNames.pointer,
    uiInputGroup,
    actionResetTypes.noReset,
  );

  const primaryPress = new HoldAction(
    uiInputActionNames.primaryPress,
    uiInputGroup,
  );

  const focusNext = new TriggerAction(
    uiInputActionNames.focusNext,
    uiInputGroup,
  );

  const shift = new HoldAction(uiInputActionNames.shift, uiInputGroup);

  const ctrl = new HoldAction(uiInputActionNames.ctrl, uiInputGroup);

  const navigateUp = new TriggerAction(
    uiInputActionNames.navigateUp,
    uiInputGroup,
  );

  const navigateDown = new TriggerAction(
    uiInputActionNames.navigateDown,
    uiInputGroup,
  );

  const navigateLeft = new TriggerAction(
    uiInputActionNames.navigateLeft,
    uiInputGroup,
  );

  const navigateRight = new TriggerAction(
    uiInputActionNames.navigateRight,
    uiInputGroup,
  );

  const activate = new TriggerAction(uiInputActionNames.activate, uiInputGroup);

  const cancel = new TriggerAction(uiInputActionNames.cancel, uiInputGroup);

  const scrollY = new Axis1dAction(
    uiInputActionNames.scrollY,
    uiInputGroup,
    actionResetTypes.zero,
  );

  const inputBackspace = new TriggerAction(
    uiInputActionNames.inputBackspace,
    uiInputGroup,
  );

  const inputDelete = new TriggerAction(
    uiInputActionNames.inputDelete,
    uiInputGroup,
  );

  const inputHome = new TriggerAction(
    uiInputActionNames.inputHome,
    uiInputGroup,
  );

  const inputEnd = new TriggerAction(uiInputActionNames.inputEnd, uiInputGroup);

  inputManager.addAxis2dActions(pointer);
  inputManager.addAxis1dActions(scrollY);
  inputManager.addHoldActions(primaryPress, shift, ctrl);
  inputManager.addTriggerActions(
    focusNext,
    navigateUp,
    navigateDown,
    navigateLeft,
    navigateRight,
    activate,
    cancel,
    inputBackspace,
    inputDelete,
    inputHome,
    inputEnd,
  );

  const { mouseSource, keyboardSource } = options;

  if (mouseSource) {
    mouseSource.axis2dBindings.add(
      new MouseAxis2dBinding(pointer, {
        cursorValueType: cursorValueTypes.absolute,
        cursorOrigin: Vector2.zero,
      }),
    );

    mouseSource.holdBindings.add(
      new MouseHoldBinding(primaryPress, mouseButtons.left),
    );

    mouseSource.axis1dBindings.add(new MouseAxis1dBinding(scrollY));
  }

  if (keyboardSource) {
    keyboardSource.triggerBindings.add(
      new KeyboardTriggerBinding(focusNext, keyCodes.tab, buttonMoments.down),
    );

    keyboardSource.holdBindings.add(
      new KeyboardHoldBinding(shift, keyCodes.shiftLeft),
    );

    keyboardSource.holdBindings.add(
      new KeyboardHoldBinding(shift, keyCodes.shiftRight),
    );

    keyboardSource.holdBindings.add(
      new KeyboardHoldBinding(ctrl, keyCodes.controlLeft),
    );

    keyboardSource.holdBindings.add(
      new KeyboardHoldBinding(ctrl, keyCodes.controlRight),
    );

    keyboardSource.triggerBindings.add(
      new KeyboardTriggerBinding(
        navigateUp,
        keyCodes.arrowUp,
        buttonMoments.down,
      ),
    );

    keyboardSource.triggerBindings.add(
      new KeyboardTriggerBinding(
        navigateDown,
        keyCodes.arrowDown,
        buttonMoments.down,
      ),
    );

    keyboardSource.triggerBindings.add(
      new KeyboardTriggerBinding(
        navigateLeft,
        keyCodes.arrowLeft,
        buttonMoments.down,
      ),
    );

    keyboardSource.triggerBindings.add(
      new KeyboardTriggerBinding(
        navigateRight,
        keyCodes.arrowRight,
        buttonMoments.down,
      ),
    );

    keyboardSource.triggerBindings.add(
      new KeyboardTriggerBinding(activate, keyCodes.enter, buttonMoments.down),
    );

    keyboardSource.triggerBindings.add(
      new KeyboardTriggerBinding(activate, keyCodes.space, buttonMoments.down),
    );

    keyboardSource.triggerBindings.add(
      new KeyboardTriggerBinding(cancel, keyCodes.escape, buttonMoments.down),
    );

    keyboardSource.triggerBindings.add(
      new KeyboardTriggerBinding(
        inputBackspace,
        keyCodes.backspace,
        buttonMoments.down,
      ),
    );

    keyboardSource.triggerBindings.add(
      new KeyboardTriggerBinding(
        inputDelete,
        keyCodes.delete,
        buttonMoments.down,
      ),
    );

    keyboardSource.triggerBindings.add(
      new KeyboardTriggerBinding(inputHome, keyCodes.home, buttonMoments.down),
    );

    keyboardSource.triggerBindings.add(
      new KeyboardTriggerBinding(inputEnd, keyCodes.end, buttonMoments.down),
    );
  }

  return {
    pointer,
    primaryPress,
    focusNext,
    shift,
    ctrl,
    navigateUp,
    navigateDown,
    navigateLeft,
    navigateRight,
    activate,
    cancel,
    scrollY,
    inputBackspace,
    inputDelete,
    inputHome,
    inputEnd,
  };
}
