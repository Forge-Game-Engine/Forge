import { createComponentId } from '../../ecs/ecs-component.js';
import { ParameterizedForgeEvent } from '../../events/index.js';

/**
 * Payload emitted by {@link UiInputEcsComponent.onChange}.
 */
export interface UiInputChangeEvent {
  /** The input box entity. */
  entity: number;
  /** The new field value after the edit. */
  value: string;
}

/**
 * Payload emitted by {@link UiInputEcsComponent.onSubmit}.
 */
export interface UiInputSubmitEvent {
  /** The input box entity. */
  entity: number;
  /** The current field value at submission time. */
  value: string;
}

/**
 * Stores the editing state of a text input box.
 *
 * Attached to the root panel entity created by {@link createUiInputBox}.
 * The input ECS system reads and writes this component to apply keyboard
 * commands and character input received from {@link UiTextInputSource}.
 *
 * Caret/selection semantics:
 * - `caretIndex` is the insertion point (0 = before first char).
 * - When `selectionAnchor` is non-null and differs from `caretIndex`, the range
 *   `[min(caret, anchor), max(caret, anchor)]` is the active selection.
 */
export interface UiInputEcsComponent {
  /** Current field value. */
  value: string;

  /** Caret insertion position within `value`. Range `[0, value.length]`. */
  caretIndex: number;

  /**
   * Anchor of an active text selection, or `null` when there is no selection.
   * The caret is the active (moving) end; the anchor is the fixed end.
   */
  selectionAnchor: number | null;

  /** Placeholder text shown when `value` is empty. */
  placeholder?: string;

  /**
   * When `true`, the displayed text is replaced with bullet characters (`•`)
   * for password-style masking. The raw `value` is unchanged.
   */
  masked?: boolean;

  /**
   * Maximum number of characters allowed. `undefined` means no limit.
   * Enforced by the input system via {@link applyEditCommand}.
   */
  maxLength?: number;

  /**
   * When `true`, Enter inserts a newline instead of submitting.
   * Default `false` (single-line).
   */
  multiline?: boolean;

  /** Raised whenever the field value changes. */
  onChange: ParameterizedForgeEvent<UiInputChangeEvent>;

  /** Raised when the user submits the field (Enter in single-line mode). */
  onSubmit: ParameterizedForgeEvent<UiInputSubmitEvent>;

  /**
   * Entity id of the text label child (a `UiTextEcsComponent` entity).
   * The input system updates `UiTextEcsComponent.text` after each edit.
   */
  textEntity: number;

  /**
   * Entity id of the caret panel child.
   * Visibility (`UiRenderableEcsComponent.enabled`) is toggled by the input
   * system on focus/blur.
   */
  caretEntity: number;

  /**
   * Entity id of the selection highlight panel child.
   * Its width and position are set by the input system to reflect the
   * current selection range.
   */
  selectionEntity: number;
}

/** Component id for {@link UiInputEcsComponent}. */
export const uiInputId = createComponentId<UiInputEcsComponent>('ui-input');
