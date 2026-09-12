import { EcsWorld } from '../../ecs/ecs-world.js';
import { ParameterizedForgeEvent } from '../../events/index.js';
import { Vector2 } from '../../math/index.js';
import {
  NineSliceOptions,
  SpriteEcsComponent,
  spriteId,
} from '../../rendering/index.js';
import {
  addUiColorTransitionComponent,
  UiColorTransitionDefaultedOptions,
} from '../components/ui-color-transition-component.js';
import {
  addUiInteractableComponent,
  UiInteractableDefaultedOptions,
  UiInteractableEcsComponent,
} from '../components/ui-interactable-component.js';
import {
  addUiToggleComponent,
  UiToggleEcsComponent,
} from '../components/ui-toggle-component.js';
import { UiAnchor, UiAnchorConfig } from '../types/ui-anchor.js';
import { createPanel } from './create-panel.js';

/**
 * Fields of {@link CreateToggleOptions} with no sensible default; callers
 * must always provide these.
 */
export interface CreateToggleRequiredOptions {
  /** The sprite to draw the toggle's box with, e.g. from `createImageSprite`. */
  sprite: SpriteEcsComponent;

  /**
   * The sprite to draw the checkmark with, shown only while the toggle is
   * on. A child panel, sized to exactly fill the box (see `createPanel`'s
   * `stretchAll` behavior) - use a checkmark image with transparent padding
   * if it shouldn't cover the box edge-to-edge.
   */
  checkmarkSprite: SpriteEcsComponent;
}

/**
 * Fields of {@link CreateToggleOptions} with a sensible default; callers may
 * omit these.
 */
export interface CreateToggleDefaultedOptions {
  /**
   * The anchor to place the toggle with - see `UiAnchor` for common
   * presets (e.g. `UiAnchor.center({ x: 32, y: 32 })`). Defaults to
   * `UiAnchor.center({ x: 32, y: 32 })`.
   */
  anchor: UiAnchorConfig;

  /** Offset of the toggle's pivot from its anchor reference point, in reference pixels. */
  anchoredPosition?: Vector2;

  /** Overrides `sprite.slices` for the toggle's box. */
  slices?: NineSliceOptions;

  /** Whether the toggle starts on. Defaults to `false`. */
  isOn: boolean;

  /**
   * The entity id of a `UiToggleGroupEcsComponent` this toggle belongs to -
   * see `addUiToggleGroupComponent`. Omitted, this toggle is an independent
   * checkbox.
   */
  group?: number;

  /**
   * Overrides for the toggle's `UiInteractableEcsComponent` (e.g. to start
   * it non-`interactable`).
   */
  interactable?: Partial<UiInteractableDefaultedOptions>;

  /**
   * Overrides for the toggle's `UiColorTransitionEcsComponent` (its
   * hover/pressed/disabled tints, transition duration, and easing).
   */
  transition?: Partial<UiColorTransitionDefaultedOptions>;
}

export type CreateToggleOptions = CreateToggleRequiredOptions &
  Partial<CreateToggleDefaultedOptions>;

export interface Toggle {
  /** The toggle's root entity - a `RectTransformEcsComponent` + `SpriteEcsComponent` + `UiInteractableEcsComponent` + `UiColorTransitionEcsComponent` + `UiToggleEcsComponent`. */
  entity: number;

  /** The child checkmark entity - shown while `toggle.isOn`. */
  checkmark: number;

  /** The toggle's `UiInteractableEcsComponent`, for reading interaction state or registering pointer-event listeners. */
  interactable: UiInteractableEcsComponent;

  /** The toggle's `UiToggleEcsComponent`, for reading/setting `isOn` directly. */
  toggle: UiToggleEcsComponent;

  /**
   * Raised whenever `isOn` changes - `toggle.onValueChanged`, surfaced
   * directly since registering a single listener on it is the overwhelmingly
   * common case.
   */
  onValueChanged: ParameterizedForgeEvent<boolean>;
}

/**
 * Creates a toggle: a panel (see `createPanel`) with a
 * `UiInteractableEcsComponent`, a `UiColorTransitionEcsComponent`, and a
 * `UiToggleEcsComponent` added, plus a child checkmark panel whose
 * `SpriteEcsComponent.enabled` tracks `isOn`. Place a caption next to it with
 * a separate `createLabel` call - unlike `createButton`, a toggle doesn't
 * assemble one itself, since a caption's placement (left, right, above) and
 * whether one exists at all varies more than a button's centered label does.
 * @param world - The ECS world to create the toggle entity in.
 * @param parent - The parent entity - a canvas (see `createUiCanvas`) or
 * another UI element.
 * @param options - Options for configuring the toggle. `sprite` and
 * `checkmarkSprite` have no sensible default and must always be provided.
 * @returns The created toggle: its entity, its child checkmark entity, its
 * `UiInteractableEcsComponent`, its `UiToggleEcsComponent`, and
 * `onValueChanged` for the common case of registering a single listener.
 */
export function createToggle(
  world: EcsWorld,
  parent: number,
  options: CreateToggleOptions,
): Toggle {
  const defaultCreateToggleOptions = {
    anchor: UiAnchor.center({ x: 32, y: 32 }),
    isOn: false,
  };

  const {
    anchor,
    anchoredPosition,
    sprite,
    slices,
    checkmarkSprite,
    isOn,
    group,
    interactable: interactableOptions,
    transition: transitionOptions,
  } = { ...defaultCreateToggleOptions, ...options };

  const entity = createPanel(world, parent, {
    anchor,
    ...(anchoredPosition && { anchoredPosition }),
    sprite,
    slices,
  });

  const interactable = addUiInteractableComponent(
    world,
    entity,
    interactableOptions,
  );
  addUiColorTransitionComponent(world, entity, transitionOptions);
  const toggle = addUiToggleComponent(world, entity, {
    isOn,
    ...(group !== undefined && { group }),
  });

  const checkmark = createPanel(world, entity, {
    // `UiAnchor.stretchAll()`'s default margin is zero on both axes, so the
    // checkmark exactly fills the box it's meant to cover.
    anchor: UiAnchor.stretchAll(),
    sprite: checkmarkSprite,
  });

  const checkmarkSpriteComponent = world.getComponentRequired(
    checkmark,
    spriteId,
  );
  checkmarkSpriteComponent.enabled = isOn;

  toggle.onValueChanged.registerListener((value) => {
    checkmarkSpriteComponent.enabled = value;
  });

  return {
    entity,
    checkmark,
    interactable,
    toggle,
    onValueChanged: toggle.onValueChanged,
  };
}
