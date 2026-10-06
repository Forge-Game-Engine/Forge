import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { ForgeEvent, ParameterizedForgeEvent } from '../../events/index.js';
import type {
  TextEntry,
  TextEntryAttributes,
} from '../../input/text-entry/text-entry.js';

/**
 * The HTML attributes a text field's hidden input carries (see
 * `TextEntryAttributes`), except `maxLength`, which is the field's own
 * {@link TextInputDefaultedOptions.maxLength}.
 */
export type TextInputAttributes = Omit<TextEntryAttributes, 'maxLength'>;

/**
 * Fields of {@link TextInputEcsComponent} with no sensible default; callers
 * must always provide these. `createTextInput` creates all of them.
 */
export interface TextInputRequiredOptions {
  /**
   * The field's hidden DOM input (see `createTextEntry`). It holds the text,
   * the selection and the IME composition; the component mirrors them.
   * Disposed by `createUiTextInputEcsSystem` when the component is removed.
   */
  readonly entry: TextEntry;

  /** The label entity the field's text is drawn with. Its `TextEcsComponent.text` is written by the text input system. */
  readonly textLabel: number;

  /**
   * The label entity shown, instead of `textLabel`, while the field is
   * empty. Its text and color are the placeholder's; the text input system
   * only shows and hides it.
   */
  readonly placeholderLabel: number;

  /** The panel entity drawn as the caret. Placed, sized and blinked by the text input system. */
  readonly caret: number;

  /** The panel entity drawn behind selected text. Placed and sized by the text input system. */
  readonly selection: number;

  /** The panel entity drawn under text that's still being composed with an IME. */
  readonly compositionUnderline: number;
}

/**
 * Fields of {@link TextInputEcsComponent} with a sensible default, or that
 * are genuinely optional; callers may omit these.
 */
export interface TextInputDefaultedOptions {
  /**
   * The most UTF-16 code units the field holds. Defaults to no limit. A
   * field doesn't scroll, so pick a limit whose longest value fits its
   * width.
   */
  maxLength: number;

  /**
   * Transforms what was typed before it's accepted, e.g. upper-casing a
   * code or dropping leading spaces. Runs after characters the field's font
   * can't draw are removed, and before `maxLength` is applied. Must return
   * the same text when given text it already returned.
   */
  filter?: (text: string) => string;

  /** The hidden input's HTML attributes (`aria-label`, `inputmode`, ...). Defaults to none. */
  attributes: TextInputAttributes;
}

/**
 * A single-line text field: the player types into a hidden DOM input
 * (`entry`), and the field draws its value, caret and selection with
 * ordinary UI entities. Build one with `createTextInput`.
 *
 * Editing is separate from UI focus: a field is edited after a tap or
 * click on it, a submit while it's focused, or `editTextInput`, and stops
 * on Enter (`onSubmit`), Escape (`onCancel`) or when the browser takes
 * focus away. UI focus can move anywhere meanwhile.
 */
export interface TextInputEcsComponent
  extends TextInputRequiredOptions, TextInputDefaultedOptions {
  /**
   * The field's committed text: what was typed, after filtering. Text
   * that's still being composed with an IME isn't part of it until it's
   * committed. System-owned, written by `createUiTextInputEcsSystem`;
   * change it with `setTextInputValue`.
   */
  value: string;

  /**
   * Whether the field is being typed into, i.e. its hidden input has focus.
   * System-owned, written by `createUiTextInputEcsSystem`; start editing
   * with `editTextInput`.
   */
  isEditing: boolean;

  /** Raised with the new `value` whenever it changes. */
  readonly onValueChanged: ParameterizedForgeEvent<string>;

  /** Raised with `value` when the player presses Enter. Editing ends. */
  readonly onSubmit: ParameterizedForgeEvent<string>;

  /** Raised when the player presses Escape. Editing ends; the value is kept. */
  readonly onCancel: ForgeEvent;
}

export const textInputId =
  createComponentId<TextInputEcsComponent>('textInput');

const defaultTextInputOptions: TextInputDefaultedOptions = {
  maxLength: Number.POSITIVE_INFINITY,
  attributes: {},
};

/**
 * Attaches a {@link TextInputEcsComponent} to `entity`. Needs a
 * `RectTransformEcsComponent` and a `UiInteractableEcsComponent` on the
 * same entity; use `createTextInput` to build a whole field.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - The field's entry, part entities and settings, plus an
 * optional initial `value`.
 * @returns The attached component.
 */
export function addTextInputComponent(
  world: EcsWorld,
  entity: number,
  options: TextInputRequiredOptions &
    Partial<TextInputDefaultedOptions> & { value?: string },
): TextInputEcsComponent {
  const { value, ...rest } = options;

  if (value !== undefined) {
    options.entry.setValue(value);
  }

  const component: TextInputEcsComponent = {
    ...defaultTextInputOptions,
    ...rest,
    value: options.entry.value,
    isEditing: false,
    onValueChanged: new ParameterizedForgeEvent('textInput.onValueChanged'),
    onSubmit: new ParameterizedForgeEvent('textInput.onSubmit'),
    onCancel: new ForgeEvent('textInput.onCancel'),
  };

  return world.addComponent(entity, textInputId, component);
}

/**
 * Replaces a text field's text, e.g. to clear or prefill it. The text goes
 * through the field's filters like typed text, and `value` and
 * `onValueChanged` update on the next tick.
 * @param world - The ECS world `field` belongs to.
 * @param field - The text field entity.
 * @param value - The new text.
 * @throws An error if `field` has no `TextInputEcsComponent`.
 */
export function setTextInputValue(
  world: EcsWorld,
  field: number,
  value: string,
): void {
  world
    .getComponentRequired<TextInputEcsComponent>(field, textInputId)
    .entry.setValue(value);
}

/**
 * Starts editing a text field, as a tap on it would, e.g. when its panel
 * opens. `isEditing` updates on the next tick. A phone only opens its
 * keyboard when this is called inside a user gesture's event handler; taps
 * on the field itself always are.
 * @param world - The ECS world `field` belongs to.
 * @param field - The text field entity.
 * @throws An error if `field` has no `TextInputEcsComponent`.
 */
export function editTextInput(world: EcsWorld, field: number): void {
  world
    .getComponentRequired<TextInputEcsComponent>(field, textInputId)
    .entry.focus();
}
