import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { InputManager } from '../../input/input-manager.js';
import { uiCanvasId } from '../components/ui-canvas-component.js';
import {
  UiInputEcsComponent,
  uiInputId,
} from '../components/ui-input-component.js';
import { uiRenderableId } from '../components/ui-renderable-component.js';
import {
  UiStateEcsComponent,
  uiStateId,
} from '../components/ui-state-component.js';
import { uiTransformId } from '../components/ui-transform-component.js';
import { uiTextId } from '../text/ui-text-ecs-component.js';
import type { UiTextInputSource } from '../utilities/create-ui-text-input-source.js';
import {
  applyEditCommand,
  UiInputState,
} from '../utilities/apply-edit-command.js';
import { setFocus } from '../utilities/set-focus.js';
import { uiInputActionNames } from '../utilities/register-ui-input-actions.js';

const canvasBuffer: number[] = [];

/** Layout constants used by {@link commitState} to position caret/selection. */
interface InputLayoutConfig {
  fontSize: number;
  padLeft: number;
  padTop: number;
  caretWidth: number;
}

const defaultInputLayout: InputLayoutConfig = {
  fontSize: 16,
  padLeft: 4,
  padTop: 4,
  caretWidth: 2,
};

/**
 * Reads the value of a trigger action by name; returns `false` if the action
 * is not registered.
 */
function tryTrigger(inputManager: InputManager, name: string): boolean {
  try {
    return inputManager.getTriggerAction(name).isTriggered;
  } catch {
    return false;
  }
}

/**
 * Reads the held state of a hold action by name; returns `false` if the action
 * is not registered.
 */
function tryHeld(inputManager: InputManager, name: string): boolean {
  try {
    return inputManager.getHoldAction(name).isHeld;
  } catch {
    return false;
  }
}

/**
 * Applies a new {@link UiInputState} back to a {@link UiInputEcsComponent},
 * fires `onChange` if the value changed, and updates the text / caret / selection
 * child entities.
 */
function commitState(
  world: EcsWorld,
  entity: number,
  input: UiInputEcsComponent,
  prev: UiInputState,
  next: UiInputState,
  layout: InputLayoutConfig,
): void {
  input.value = next.value;
  input.caretIndex = next.caretIndex;
  input.selectionAnchor = next.selectionAnchor;

  // Update display text
  const textComp = world.getComponent(input.textEntity, uiTextId);

  if (textComp) {
    if (input.value.length > 0) {
      textComp.text = input.masked
        ? '•'.repeat(input.value.length)
        : input.value;
    } else {
      textComp.text = input.placeholder ?? '';
    }

    textComp.dirty = true;
  }

  // Update caret position
  // Approximate character width using fontSize * 0.6 (monospace approximation;
  // real text metrics would require font shaping).
  const charWidth = layout.fontSize * 0.6;
  const caretX = layout.padLeft + next.caretIndex * charWidth;
  const caretTransform = world.getComponent(input.caretEntity, uiTransformId);

  if (caretTransform) {
    caretTransform.offsetMin.x = caretX;
    caretTransform.offsetMax.x = caretX + layout.caretWidth;
    caretTransform.offsetMin.y = layout.padTop;
    caretTransform.offsetMax.y = layout.padTop + layout.fontSize;
    caretTransform.isDirty = true;
  }

  // Update selection highlight
  const hasSelection =
    next.selectionAnchor !== null && next.selectionAnchor !== next.caretIndex;
  const selRenderable = world.getComponent(
    input.selectionEntity,
    uiRenderableId,
  );

  if (selRenderable) {
    selRenderable.enabled = hasSelection;
  }

  if (hasSelection && next.selectionAnchor !== null) {
    const selStart = Math.min(next.caretIndex, next.selectionAnchor);
    const selEnd = Math.max(next.caretIndex, next.selectionAnchor);
    const selX = layout.padLeft + selStart * charWidth;
    const selTransform = world.getComponent(
      input.selectionEntity,
      uiTransformId,
    );

    if (selTransform) {
      selTransform.offsetMin.x = selX;
      selTransform.offsetMax.x = selX + (selEnd - selStart) * charWidth;
      selTransform.offsetMin.y = layout.padTop;
      selTransform.offsetMax.y = layout.padTop + layout.fontSize;
      selTransform.isDirty = true;
    }
  }

  if (next.value !== prev.value) {
    input.onChange.raise({ entity, value: next.value });
  }
}

/**
 * Applies arrow-key caret navigation commands from the input manager.
 * Returns the updated state.
 */
function applyNavigationCommands(
  state: UiInputState,
  inputManager: InputManager,
  shiftHeld: boolean,
  ctrlHeld: boolean,
): UiInputState {
  let current = state;

  if (tryTrigger(inputManager, uiInputActionNames.navigateLeft)) {
    current = ctrlHeld
      ? applyEditCommand(current, {
          type: 'moveCaretWord',
          direction: 'left',
          select: shiftHeld,
        })
      : applyEditCommand(current, {
          type: 'moveCaret',
          delta: -1,
          select: shiftHeld,
        });
  }

  if (tryTrigger(inputManager, uiInputActionNames.navigateRight)) {
    current = ctrlHeld
      ? applyEditCommand(current, {
          type: 'moveCaretWord',
          direction: 'right',
          select: shiftHeld,
        })
      : applyEditCommand(current, {
          type: 'moveCaret',
          delta: 1,
          select: shiftHeld,
        });
  }

  if (tryTrigger(inputManager, uiInputActionNames.inputHome)) {
    current = applyEditCommand(current, { type: 'home', select: shiftHeld });
  }

  if (tryTrigger(inputManager, uiInputActionNames.inputEnd)) {
    current = applyEditCommand(current, { type: 'end', select: shiftHeld });
  }

  if (tryTrigger(inputManager, uiInputActionNames.inputBackspace)) {
    current = applyEditCommand(current, { type: 'backspace' });
  }

  if (tryTrigger(inputManager, uiInputActionNames.inputDelete)) {
    current = applyEditCommand(current, { type: 'delete' });
  }

  return current;
}

/**
 * Creates the UI input ECS system (Feature F7.2).
 *
 * The system handles all keyboard editing and character insertion for
 * {@link UiInputEcsComponent} entities that currently have focus.
 *
 * Character input:
 * - Characters arrive via {@link UiTextInputSource.onInput} (a hidden DOM
 *   `<input>` element that captures IME and clipboard events).
 *
 * Keyboard commands (via input actions registered by
 * {@link registerUiInputActions}):
 * - **Arrow left/right** — move caret by ±1; with Ctrl held, jump a word.
 * - **Arrow left/right + Shift** — extend/shrink selection.
 * - **Home / End** — jump to field start / end; with Shift, extend selection.
 * - **Backspace** — delete char/selection before caret.
 * - **Delete** — delete char/selection after caret.
 * - **Enter (`ui.activate`)** — submit (single-line) or insert newline (multiline).
 * - **Escape (`ui.cancel`)** — blur the field (handled by keyboard nav system).
 *
 * The system must be added **after** the layout system.
 *
 * @param inputManager - The input manager used to read keyboard actions.
 * @param textInputSource - The text input source created by
 *   {@link createUiTextInputSource}. Pass `undefined` for headless / test use.
 * @returns The input ECS system.
 */
export const createUiInputEcsSystem = (
  inputManager: InputManager,
  textInputSource?: UiTextInputSource,
): EcsSystem<[UiInputEcsComponent, UiStateEcsComponent]> => {
  // Buffer for pendingChars gathered from textInputSource.onInput per frame.
  let pendingChars = '';

  // Register a persistent listener on the text input source so characters
  // accumulate into pendingChars each frame.
  if (textInputSource) {
    textInputSource.onInput.registerListener((chars) => {
      pendingChars += chars;
    });
  }

  return {
    query: [uiInputId, uiStateId],

    run: (result, world: EcsWorld): void => {
      const entity = result.entity;
      const [input, state] = result.components;

      if (!state.focused) {
        return;
      }

      let current: UiInputState = {
        value: input.value,
        caretIndex: input.caretIndex,
        selectionAnchor: input.selectionAnchor,
        maxLength: input.maxLength,
      };

      const prev = { ...current };

      // ── Character insertion ──────────────────────────────────────────

      if (pendingChars.length > 0) {
        current = applyEditCommand(current, {
          type: 'insert',
          text: pendingChars,
        });
        pendingChars = '';
      }

      // ── Navigation + edit commands ───────────────────────────────────

      const shiftHeld = tryHeld(inputManager, uiInputActionNames.shift);
      const ctrlHeld = tryHeld(inputManager, uiInputActionNames.ctrl);

      current = applyNavigationCommands(
        current,
        inputManager,
        shiftHeld,
        ctrlHeld,
      );

      // ── Submit / Cancel ──────────────────────────────────────────────

      if (tryTrigger(inputManager, uiInputActionNames.activate)) {
        if (input.multiline) {
          current = applyEditCommand(current, { type: 'insert', text: '\n' });
        } else {
          input.onSubmit.raise({ entity, value: current.value });
          world.queryEntities([uiCanvasId], canvasBuffer);

          if (canvasBuffer.length > 0) {
            setFocus(world, canvasBuffer[0], null, 'keyboard');
          }

          return;
        }
      }

      if (tryTrigger(inputManager, uiInputActionNames.cancel)) {
        return;
      }

      // ── Commit state ─────────────────────────────────────────────────

      commitState(world, entity, input, prev, current, defaultInputLayout);
    },
  };
};
