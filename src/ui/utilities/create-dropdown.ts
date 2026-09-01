import { EcsWorld } from '../../ecs/ecs-world.js';
import { ParameterizedForgeEvent } from '../../events/index.js';
import { Vector2 } from '../../math/index.js';
import {
  Color,
  NineSliceOptions,
  SpriteEcsComponent,
  spriteId,
} from '../../rendering/index.js';
import type { FontAtlas } from '../../text/font-atlas/font-atlas.js';
import { textHorizontalAlignments, textId } from '../../text/index.js';
import { UiColorTransitionDefaultedOptions } from '../components/ui-color-transition-component.js';
import { UiInteractableDefaultedOptions } from '../components/ui-interactable-component.js';
import {
  addUiDropdownComponent,
  UiDropdownEcsComponent,
} from '../components/ui-dropdown-component.js';
import { UiAnchor, UiAnchorPreset } from '../types/ui-anchor.js';
import { Button, createButton } from './create-button.js';
import { createLabel } from './create-label.js';

/**
 * Fields of {@link CreateDropdownOptions} with no sensible default; callers
 * must always provide these.
 */
export interface CreateDropdownRequiredOptions {
  /** The sprite to draw the header (the always-visible, currently-selected-option control) with. */
  headerSprite: SpriteEcsComponent;

  /** The sprite to draw each option row with. */
  optionSprite: SpriteEcsComponent;

  /** The dropdown's option labels, in display order. Must be non-empty. */
  options: readonly string[];

  /** The loaded font atlas the header and option labels are drawn from. */
  fontAtlas: FontAtlas;
}

/**
 * Fields of {@link CreateDropdownOptions} with a sensible default; callers
 * may omit these.
 */
export interface CreateDropdownDefaultedOptions {
  /** The anchor/pivot preset to place the header with. Defaults to `UiAnchor.topLeft`. */
  anchor: UiAnchorPreset;

  /** Offset of the header's pivot from its anchor reference point, in reference pixels. */
  anchoredPosition?: Vector2;

  /** The header's size in reference pixels when point-anchored; a margin relative to the anchor rect when stretched. Defaults to `240x56`. */
  sizeDelta: Vector2;

  /** Overrides `headerSprite.slices`/`optionSprite.slices`. */
  slices?: NineSliceOptions;

  /** The index into `options` initially selected. Defaults to `0`. */
  selectedIndex: number;

  /** The header's and each option's label font size, in reference pixels. Defaults to `24`. */
  labelSize: number;

  /** The header's and each option's label tint. Defaults to `Color.black`. */
  labelColor: Color;

  /**
   * The render category the header's and each option's label text draws
   * with, forwarded to `createLabel`'s `category` option - see
   * `CreateButtonDefaultedOptions.labelCategory` for why there's no shared
   * default to fall back on.
   */
  labelCategory?: number;

  /** Each option row's height, in reference pixels. Defaults to the header's own `sizeDelta.y`. */
  optionHeight?: number;

  /**
   * Overrides for the header's `UiInteractableEcsComponent` (e.g. to start
   * it non-`interactable`). Also applied to every option row.
   */
  interactable?: Partial<UiInteractableDefaultedOptions>;

  /**
   * Overrides for the header's and each option row's
   * `UiColorTransitionEcsComponent`.
   */
  transition?: Partial<UiColorTransitionDefaultedOptions>;
}

export type CreateDropdownOptions = CreateDropdownRequiredOptions &
  Partial<CreateDropdownDefaultedOptions>;

export interface Dropdown {
  /** The dropdown's root entity - the header - a `createButton` result's entity, also carrying the `UiDropdownEcsComponent`. */
  entity: number;

  /** The header button, showing the currently selected option's label. Clicking it toggles `isOpen`. */
  header: Button;

  /**
   * The option row buttons, in `options` order, parented to the header -
   * hidden (invisible and non-interactable) while closed. Clicking one
   * selects it and closes the list.
   */
  options: Button[];

  /**
   * The chevron label entity, parented to the header - shows `v` while
   * closed and `^` while open (see `chevronClosedText`/`chevronOpenText`;
   * the bundled default font atlas is ASCII-only, so these stand in for a
   * down/up-pointing triangle).
   */
  chevron: number;

  /** The dropdown's `UiDropdownEcsComponent`, for reading `isOpen`/`selectedIndex` directly. */
  dropdown: UiDropdownEcsComponent;

  /**
   * Raised whenever an option is selected - `dropdown.onValueChanged`,
   * surfaced directly since registering a single listener on it is the
   * overwhelmingly common case.
   */
  onValueChanged: ParameterizedForgeEvent<number>;
}

/** The anchor every option row shares: full header width, hanging down from the header's bottom edge. */
const optionRowAnchor: UiAnchorPreset = {
  anchorMin: { x: 0, y: 0 },
  anchorMax: { x: 1, y: 0 },
  pivot: { x: 0.5, y: 1 },
};

/**
 * The chevron glyph shown while the option list is closed/open,
 * respectively. The bundled default font atlas only covers ASCII, so these
 * stand in for a down/up-pointing triangle rather than proper chevron
 * glyphs (e.g. `▼`/`▲`), which it doesn't have.
 */
const chevronClosedText = 'v';
const chevronOpenText = '^';

/**
 * Creates a dropdown: a header button (see `createButton`) showing the
 * currently selected option and a chevron indicator on its right edge, with
 * a `UiDropdownEcsComponent` added, plus one option-row button per entry in
 * `options`, stacked below the header and hidden until the header is
 * clicked open. Selecting an option updates the header's label, raises
 * `onValueChanged`, and closes the list. The chevron flips between
 * `chevronClosedText` and `chevronOpenText` in step with `dropdown.isOpen`.
 *
 * **Known limitation**: clicking outside the open list doesn't close it -
 * only clicking the header again or selecting an option does. Register your
 * own listener (e.g. on a full-canvas click-catcher, gated on
 * `dropdown.isOpen`) if your game needs that.
 * @param world - The ECS world to create the dropdown entity in.
 * @param parent - The parent entity - a canvas (see `createUiCanvas`) or
 * another UI element.
 * @param options - Options for configuring the dropdown. `headerSprite`,
 * `optionSprite`, `options`, and `fontAtlas` have no sensible default and
 * must always be provided.
 * @returns The created dropdown: its header entity/button, its option row
 * buttons, its chevron label entity, its `UiDropdownEcsComponent`, and
 * `onValueChanged` for the common case of registering a single listener.
 */
export function createDropdown(
  world: EcsWorld,
  parent: number,
  options: CreateDropdownOptions,
): Dropdown {
  const defaultCreateDropdownOptions = {
    anchor: UiAnchor.topLeft,
    sizeDelta: { x: 240, y: 56 },
    selectedIndex: 0,
    labelSize: 24,
    labelColor: Color.black,
  };

  const {
    anchor,
    anchoredPosition,
    sizeDelta,
    headerSprite,
    optionSprite,
    slices,
    options: optionLabels,
    fontAtlas,
    selectedIndex,
    labelSize,
    labelColor,
    labelCategory,
    optionHeight,
    interactable: interactableOptions,
    transition: transitionOptions,
  } = { ...defaultCreateDropdownOptions, ...options };

  const resolvedOptionHeight = optionHeight ?? sizeDelta.y;

  // Reserves room on the header's right edge for the chevron, so the
  // selected-option label (`createButton`'s own centered label, `maxWidth`
  // otherwise defaulting to the header's full `sizeDelta.x`) doesn't
  // overlap it.
  const chevronReservedWidth = labelSize * 1.5;

  const header = createButton(world, parent, {
    anchor,
    ...(anchoredPosition && { anchoredPosition }),
    sizeDelta,
    labelMaxWidth: sizeDelta.x - chevronReservedWidth,
    sprite: headerSprite,
    slices,
    label: optionLabels[selectedIndex],
    fontAtlas,
    labelSize,
    labelColor,
    ...(labelCategory !== undefined && { labelCategory }),
    interactable: interactableOptions,
    transition: transitionOptions,
  });

  const dropdown = addUiDropdownComponent(world, header.entity, {
    options: optionLabels,
    selectedIndex,
  });

  const chevron = createLabel(world, header.entity, {
    text: chevronClosedText,
    fontAtlas,
    size: labelSize,
    anchor: UiAnchor.middleRight,
    anchoredPosition: { x: -chevronReservedWidth / 2, y: 0 },
    horizontalAlign: textHorizontalAlignments.center,
    verticalAlign: 'middle',
    color: labelColor,
    ...(labelCategory !== undefined && { category: labelCategory }),
  });
  const chevronText = world.getComponent(chevron, textId)!;

  const optionButtons = optionLabels.map((label, index) =>
    createButton(world, header.entity, {
      anchor: optionRowAnchor,
      anchoredPosition: { x: 0, y: -resolvedOptionHeight * index },
      sizeDelta: { x: 0, y: resolvedOptionHeight },
      // `optionRowAnchor` stretches each row to the header's full width
      // with a zero margin (`sizeDelta.x` above), so the row's actual
      // rendered width is the header's own `sizeDelta.x`, not its own -
      // `createButton` can't derive that from a stretched button's own
      // options alone (see `labelMaxWidth`'s doc comment).
      labelMaxWidth: sizeDelta.x,
      sprite: optionSprite,
      slices,
      label,
      fontAtlas,
      labelSize,
      labelColor,
      ...(labelCategory !== undefined && { labelCategory }),
      interactable: { interactable: false, blocksRaycasts: false },
      transition: transitionOptions,
    }),
  );

  const headerLabelText = world.getComponent(header.label, textId)!;

  const setOpen = (isOpen: boolean): void => {
    dropdown.isOpen = isOpen;
    chevronText.text = isOpen ? chevronOpenText : chevronClosedText;

    for (const optionButton of optionButtons) {
      optionButton.interactable.interactable = isOpen;
      optionButton.interactable.blocksRaycasts = isOpen;
      world.getComponent<SpriteEcsComponent>(
        optionButton.entity,
        spriteId,
      )!.enabled = isOpen;
      world.getComponent(optionButton.label, textId)!.enabled = isOpen;
    }
  };

  header.onInvoke.registerListener(() => setOpen(!dropdown.isOpen));

  optionButtons.forEach((optionButton, index) => {
    optionButton.onInvoke.registerListener(() => {
      dropdown.selectedIndex = index;
      headerLabelText.text = optionLabels[index];
      dropdown.onValueChanged.raise(index);
      setOpen(false);
    });
  });

  setOpen(false);

  return {
    entity: header.entity,
    header,
    options: optionButtons,
    chevron,
    dropdown,
    onValueChanged: dropdown.onValueChanged,
  };
}
