import { addPositionComponent } from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { ForgeEvent, ParameterizedForgeEvent } from '../../events/index.js';
import { createTextEntry } from '../../input/text-entry/text-entry.js';
import { Vector2 } from '../../math/index.js';
import {
  addVisibilityComponent,
  Color,
  NineSliceOptions,
  RenderContext,
  SpriteEcsComponent,
} from '../../rendering/index.js';
import type { FontAtlas } from '../../text/font-atlas/font-atlas.js';
import {
  textHorizontalAlignments,
  textVerticalAlignments,
} from '../../text/index.js';
import { addRectTransformComponent } from '../components/rect-transform-component.js';
import {
  addTextInputComponent,
  TextInputAttributes,
  TextInputEcsComponent,
} from '../components/text-input-component.js';
import {
  addUiColorTransitionComponent,
  UiColorTransitionDefaultedOptions,
} from '../components/ui-color-transition-component.js';
import {
  addUiInteractableComponent,
  UiInteractableDefaultedOptions,
  UiInteractableEcsComponent,
} from '../components/ui-interactable-component.js';
import { UiAnchor, UiAnchorConfig } from '../types/ui-anchor.js';
import { UiAxis } from '../types/ui-axis.js';
import { createLabel } from './create-label.js';
import { createPanel } from './create-panel.js';
import { withDefaults } from '../../utilities/with-defaults.js';

/**
 * Fields of {@link CreateTextInputOptions} with no sensible default; callers
 * must always provide these.
 */
export interface CreateTextInputRequiredOptions {
  /**
   * The render context the field is drawn with. The field's hidden input
   * is added to its canvas's parent element (the game's container).
   */
  renderContext: RenderContext;

  /** The sprite to draw the field's background with, e.g. from `createImageSprite`. */
  sprite: SpriteEcsComponent;

  /**
   * A plain sprite (e.g. a white pixel) the caret, the selection highlight
   * and the IME composition underline are drawn with, tinted by
   * `caretColor` and `selectionColor`.
   */
  fillSprite: SpriteEcsComponent;

  /** The loaded font atlas the text is drawn from. Characters it has no glyph for can't be typed. */
  fontAtlas: FontAtlas;

  /** The text's font size, in reference pixels. */
  size: number;
}

/**
 * Fields of {@link CreateTextInputOptions} with a sensible default, or that
 * are genuinely optional; callers may omit these.
 */
export interface CreateTextInputDefaultedOptions {
  /**
   * The anchor to place the field with - see `UiAnchor` for common presets.
   * Defaults to `UiAnchor.center({ x: 400, y: 64 })`.
   */
  anchor: UiAnchorConfig;

  /** Offset of the field's pivot from its anchor reference point, in reference pixels. */
  anchoredPosition?: Vector2;

  /** Overrides `sprite.slices` for the background. */
  slices?: NineSliceOptions;

  /** Space between the field's left edge and its text, in reference pixels. Defaults to `16`. */
  padding: number;

  /** The field's initial text. Defaults to `''`. */
  value: string;

  /** The text shown while the field is empty. Defaults to `''`. */
  placeholder: string;

  /** The text's color. Defaults to `Color.black`. */
  textColor: Color;

  /** The placeholder's color. Defaults to a translucent gray. */
  placeholderColor: Color;

  /** The caret's and composition underline's color. Defaults to `Color.black`. */
  caretColor: Color;

  /** The selection highlight's color. Defaults to a translucent blue. */
  selectionColor: Color;

  /** The caret's width, in reference pixels. Defaults to `2`. */
  caretWidth: number;

  /**
   * The render category the text and placeholder draw with (see
   * `createLabel`'s `category`). Pass the value you gave the canvas's
   * `cullingMask`.
   */
  category?: number;

  /** See `TextInputDefaultedOptions.maxLength`. Defaults to no limit. */
  maxLength?: number;

  /** See `TextInputDefaultedOptions.filter`. */
  filter?: (text: string) => string;

  /** The hidden input's HTML attributes, e.g. `{ ariaLabel: 'Pilot name' }`. */
  attributes?: TextInputAttributes;

  /** Overrides for the field's `UiInteractableEcsComponent`. */
  interactable?: Partial<UiInteractableDefaultedOptions>;

  /** Overrides for the field's `UiColorTransitionEcsComponent` (its hover/pressed/disabled tints). */
  transition?: Partial<UiColorTransitionDefaultedOptions>;
}

export type CreateTextInputOptions = CreateTextInputRequiredOptions &
  Partial<CreateTextInputDefaultedOptions>;

/** The entities and components {@link createTextInput} created. */
export interface TextInput {
  /** The field's root entity: background panel, `UiInteractableEcsComponent` and `TextInputEcsComponent`. */
  entity: number;

  /** The field's `TextInputEcsComponent`, for reading `value` and `isEditing`. */
  textInput: TextInputEcsComponent;

  /** The field's `UiInteractableEcsComponent`. */
  interactable: UiInteractableEcsComponent;

  /** The label the value is drawn with. */
  textLabel: number;

  /** The label shown while the field is empty. */
  placeholderLabel: number;

  /** `textInput.onValueChanged`. */
  onValueChanged: ParameterizedForgeEvent<string>;

  /** `textInput.onSubmit`. */
  onSubmit: ParameterizedForgeEvent<string>;

  /** `textInput.onCancel`. */
  onCancel: ForgeEvent;
}

/** A zero-size point at the text origin, so a child's anchored position is an offset from it. */
const originAnchor = (pivot: Vector2, size: Vector2): UiAnchorConfig => ({
  x: UiAxis.point(0, { pivot: pivot.x, size: size.x }),
  y: UiAxis.point(0, { pivot: pivot.y, size: size.y }),
});

/**
 * Creates a single-line text field: a background panel (see `createPanel`)
 * with a `UiInteractableEcsComponent` (so it's hoverable, focusable and
 * reachable by navigation), a `UiColorTransitionEcsComponent` and a
 * `TextInputEcsComponent`, plus child entities for the selection
 * highlight, the text, the placeholder, the IME composition underline and
 * the caret. The player types into a hidden DOM input the field owns;
 * `createUiTextInputEcsSystem` (registered by `registerUiSystems`) does the
 * rest.
 *
 * The text sits `padding` from the field's left edge, its baseline placed
 * so the font's ascender-to-descender box is centered vertically. The field
 * doesn't scroll or clip, so choose a `maxLength` whose longest value fits
 * its width.
 * @param world - The ECS world to create the field in.
 * @param parent - The parent entity - a canvas (see `createUiCanvas`) or
 * another UI element.
 * @param options - Options for configuring the field. `renderContext`,
 * `sprite`, `fillSprite`, `fontAtlas` and `size` must always be provided.
 * @returns The created field.
 * @throws An error if the render context's canvas isn't in the document.
 */
export function createTextInput(
  world: EcsWorld,
  parent: number,
  options: CreateTextInputOptions,
): TextInput {
  // Built inside the function body since it references `Color`, which
  // `rendering` and `ui`'s load-time import cycle may not have defined yet
  // at this module's top level (see `createButton`).
  const defaultCreateTextInputOptions = {
    anchor: UiAnchor.center({ x: 400, y: 64 }),
    padding: 16,
    value: '',
    placeholder: '',
    textColor: Color.black,
    placeholderColor: new Color(0, 0, 0, 0.45),
    caretColor: Color.black,
    selectionColor: new Color(0.25, 0.5, 1, 0.4),
    caretWidth: 2,
  };

  const {
    renderContext,
    anchor,
    anchoredPosition,
    sprite,
    slices,
    fillSprite,
    fontAtlas,
    size,
    padding,
    value,
    placeholder,
    textColor,
    placeholderColor,
    caretColor,
    selectionColor,
    caretWidth,
    category,
    maxLength,
    filter,
    attributes,
    interactable: interactableOptions,
    transition: transitionOptions,
  } = withDefaults(defaultCreateTextInputOptions, options);

  const container = renderContext.canvas.parentElement;

  if (!container) {
    throw new Error(
      'Unable to create a text input: the render context canvas has no parent element to add its hidden input to.',
    );
  }

  const entity = createPanel(world, parent, {
    anchor,
    anchoredPosition,
    sprite,
    slices,
  });

  const interactable = addUiInteractableComponent(
    world,
    entity,
    interactableOptions,
  );

  addUiColorTransitionComponent(world, entity, transitionOptions);

  const { ascender, descender } = fontAtlas.data.metrics;
  const lineHeight = (ascender - descender) * size;

  const origin = world.createEntity();

  addPositionComponent(world, origin);
  world.setParent(origin, entity);
  addRectTransformComponent(world, origin, {
    x: UiAxis.point(0, { pivot: 0, size: 0 }),
    y: UiAxis.point(0.5, { size: 0 }),
    anchoredPosition: { x: padding, y: (-(ascender + descender) / 2) * size },
  });

  const createFill = (
    color: Color,
    pivot: Vector2,
    partSize: Vector2,
  ): number => {
    const part = createPanel(world, origin, {
      anchor: originAnchor(pivot, partSize),
      sprite: { ...fillSprite, tintColor: color },
    });

    addVisibilityComponent(world, part, { visible: false });

    return part;
  };

  const selection = createFill(
    selectionColor,
    { x: 0, y: 0 },
    { x: 0, y: lineHeight },
  );

  const labelOptions = {
    fontAtlas,
    size,
    anchor: originAnchor({ x: 0, y: 0 }, { x: 0, y: 0 }),
    horizontalAlign: textHorizontalAlignments.left,
    verticalAlign: textVerticalAlignments.baseline,
    // A player's text is drawn as typed: `<b>` typed into a field isn't
    // markup, and the caret stops must line up with the input's value.
    richText: false,
    category,
  };

  const textLabel = createLabel(world, origin, {
    ...labelOptions,
    text: value,
    color: textColor,
  });
  const placeholderLabel = createLabel(world, origin, {
    ...labelOptions,
    text: placeholder,
    color: placeholderColor,
  });

  addVisibilityComponent(world, placeholderLabel, {
    visible: value.length === 0,
  });

  const compositionUnderline = createFill(
    caretColor,
    { x: 0, y: 0.5 },
    { x: 0, y: caretWidth },
  );
  const caret = createFill(
    caretColor,
    { x: 0.5, y: 0 },
    { x: caretWidth, y: lineHeight },
  );

  const textInput = addTextInputComponent(world, entity, {
    entry: createTextEntry(container),
    textLabel,
    placeholderLabel,
    caret,
    selection,
    compositionUnderline,
    value,
    maxLength,
    filter,
    attributes,
  });

  return {
    entity,
    textInput,
    interactable,
    textLabel,
    placeholderLabel,
    onValueChanged: textInput.onValueChanged,
    onSubmit: textInput.onSubmit,
    onCancel: textInput.onCancel,
  };
}
