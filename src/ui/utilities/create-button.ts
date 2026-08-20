import { EcsWorld } from '../../ecs/ecs-world.js';
import { ForgeEvent } from '../../events/index.js';
import { Vector2 } from '../../math/index.js';
import {
  Color,
  NineSliceOptions,
  SpriteEcsComponent,
} from '../../rendering/index.js';
import type { FontAtlas } from '../../text/font-atlas/font-atlas.js';
import {
  addUiColorTransitionComponent,
  UiColorTransitionDefaultedOptions,
} from '../components/ui-color-transition-component.js';
import {
  addUiInteractableComponent,
  UiInteractableDefaultedOptions,
  UiInteractableEcsComponent,
} from '../components/ui-interactable-component.js';
import { UiAnchor, UiAnchorPreset } from '../types/ui-anchor.js';
import { createLabel } from './create-label.js';
import { createPanel } from './create-panel.js';

export interface CreateButtonOptions {
  /** The anchor/pivot preset to place the button with. Defaults to `UiAnchor.center`. */
  anchor?: UiAnchorPreset;

  /** Offset of the button's pivot from its anchor reference point, in reference pixels. */
  anchoredPosition?: Vector2;

  /** Size in reference pixels when point-anchored; a margin relative to the anchor rect when stretched. Defaults to `200x60`. */
  sizeDelta?: Vector2;

  /**
   * The sprite to draw the button's background with, e.g. from
   * `createImageSprite` - see `createPanel`'s `sprite` option, which this
   * is passed straight through to.
   */
  sprite: SpriteEcsComponent;

  /** Overrides `sprite.slices` for this button. */
  slices?: NineSliceOptions;

  /** The button's label text. */
  label: string;

  /** The loaded font atlas the label is drawn from. */
  fontAtlas: FontAtlas;

  /** The label's font size, in reference pixels. */
  labelSize: number;

  /** The label's tint. Defaults to `Color.black`. */
  labelColor?: Color;

  /**
   * Overrides for the button's `UiInteractableEcsComponent` (e.g. to start
   * it non-`interactable`, or to disable `blocksRaycasts`).
   */
  interactable?: Partial<UiInteractableDefaultedOptions>;

  /**
   * Overrides for the button's `UiColorTransitionEcsComponent` (its
   * hover/pressed/disabled tints, transition duration, and easing).
   */
  transition?: Partial<UiColorTransitionDefaultedOptions>;
}

export interface Button {
  /** The button's root entity - a `RectTransformEcsComponent` + `SpriteEcsComponent` + `UiInteractableEcsComponent` + `UiColorTransitionEcsComponent`. */
  entity: number;

  /** The child label entity - see `createLabel`. */
  label: number;

  /** The button's `UiInteractableEcsComponent`, for reading interaction state (`isHovered`, `isPressed`, ...) or registering pointer-event listeners beyond `onInvoke`. */
  interactable: UiInteractableEcsComponent;

  /**
   * Raised when the button is invoked, by a pointer click or a submit
   * action - `interactable.onInvoke`, surfaced directly since registering a
   * single listener on it is the overwhelmingly common case.
   */
  onInvoke: ForgeEvent;
}

/**
 * Creates a button: a panel (see `createPanel`) with a
 * `UiInteractableEcsComponent` and a `UiColorTransitionEcsComponent` added,
 * plus a centered child label (see `createLabel`). There is no
 * `ButtonEcsComponent` - a button is fully described by those three parts,
 * each of which is independently useful and can be dropped or replaced by
 * building the same pieces by hand instead of calling this.
 * @param world - The ECS world to create the button entity in.
 * @param parent - The parent entity - a canvas (see `createUiCanvas`) or
 * another UI element.
 * @param options - Options for configuring the button. `sprite`, `label`,
 * `fontAtlas`, and `labelSize` have no sensible default and must always be
 * provided.
 * @returns The created button: its entity, its child label entity, its
 * `UiInteractableEcsComponent`, and `onInvoke` for the common case of
 * registering a single listener.
 */
export function createButton(
  world: EcsWorld,
  parent: number,
  options: Pick<
    CreateButtonOptions,
    'sprite' | 'label' | 'fontAtlas' | 'labelSize'
  > &
    Partial<
      Omit<CreateButtonOptions, 'sprite' | 'label' | 'fontAtlas' | 'labelSize'>
    >,
): Button {
  // Built inside the function body (rather than as a shared module-level
  // default) since it references `Color.black`, and `rendering` and `ui`
  // participate in a load-time import cycle - resolving that reference
  // eagerly at this module's own top level can run before `rendering`'s
  // `Color` export exists yet. See `sprite-component.ts`'s
  // `defaultSpriteOptions` for the same pattern.
  const defaultCreateButtonOptions = {
    anchor: UiAnchor.center,
    sizeDelta: { x: 200, y: 60 },
    labelColor: Color.black,
  };

  const {
    anchor,
    anchoredPosition,
    sizeDelta,
    sprite,
    slices,
    label,
    fontAtlas,
    labelSize,
    labelColor,
    interactable: interactableOptions,
    transition: transitionOptions,
  } = { ...defaultCreateButtonOptions, ...options };

  const entity = createPanel(world, parent, {
    anchor,
    ...(anchoredPosition && { anchoredPosition }),
    sizeDelta,
    sprite,
    slices,
  });

  const interactable = addUiInteractableComponent(
    world,
    entity,
    interactableOptions,
  );
  addUiColorTransitionComponent(world, entity, transitionOptions);

  const labelEntity = createLabel(world, entity, {
    text: label,
    fontAtlas,
    size: labelSize,
    anchor: UiAnchor.stretchAll,
    verticalAlign: 'middle',
    horizontalAlign: 'center',
    color: labelColor,
  });

  return {
    entity,
    label: labelEntity,
    interactable,
    onInvoke: interactable.onInvoke,
  };
}
