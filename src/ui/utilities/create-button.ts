import { EcsWorld } from '../../ecs/ecs-world.js';
import { ForgeEvent } from '../../events/index.js';
import { Vector2 } from '../../math/index.js';
import {
  Color,
  NineSliceOptions,
  SpriteEcsComponent,
} from '../../rendering/index.js';
import type { FontAtlas } from '../../text/font-atlas/font-atlas.js';
import { textHorizontalAlignments } from '../../text/index.js';
import {
  addUiColorTransitionComponent,
  UiColorTransitionDefaultedOptions,
} from '../components/ui-color-transition-component.js';
import {
  addUiInteractableComponent,
  UiInteractableDefaultedOptions,
  UiInteractableEcsComponent,
} from '../components/ui-interactable-component.js';
import { AnchorPivotConfig, UiAnchor } from '../types/ui-anchor.js';
import { createLabel } from './create-label.js';
import { createPanel } from './create-panel.js';

/**
 * Fields of {@link CreateButtonOptions} with no sensible default; callers
 * must always provide these.
 */
export interface CreateButtonRequiredOptions {
  /**
   * The sprite to draw the button's background with, e.g. from
   * `createImageSprite` - see `createPanel`'s `sprite` option, which this
   * is passed straight through to.
   */
  sprite: SpriteEcsComponent;

  /** The button's label text. */
  label: string;

  /** The loaded font atlas the label is drawn from. */
  fontAtlas: FontAtlas;

  /** The label's font size, in reference pixels. */
  labelSize: number;
}

/**
 * Fields of {@link CreateButtonOptions} with a sensible default, or that are
 * genuinely optional (no default at all); callers may omit these.
 */
export interface CreateButtonDefaultedOptions {
  /** The anchor/pivot preset to place the button with. Defaults to `UiAnchor.center`. */
  anchor: AnchorPivotConfig;

  /** Offset of the button's pivot from its anchor reference point, in reference pixels. */
  anchoredPosition?: Vector2;

  /** Size in reference pixels when point-anchored; a margin relative to the anchor rect when stretched. Defaults to `200x60`. */
  sizeOrMargin: Vector2;

  /**
   * The width the label centers within, in reference pixels. Defaults to
   * `sizeOrMargin.x`, which is only the button's actual rendered width for a
   * point anchor - pass this explicitly when `anchor` is a stretch anchor,
   * where `sizeOrMargin.x` is a margin rather than a width and can't be used
   * to derive it (see `createDropdown`'s option rows, which stretch to the
   * header's width and pass that through here).
   */
  labelMaxWidth?: number;

  /** Overrides `sprite.slices` for this button. */
  slices?: NineSliceOptions;

  /** The label's tint. Defaults to `Color.black`. */
  labelColor: Color;

  /**
   * The render category the label's text draws with, forwarded to
   * `createLabel`'s `category` option - omitted, the label falls back to
   * `TextEcsComponent`'s own default (`TEXT_RENDER_CATEGORY`), same as any
   * other label. Pass the same value you gave the button's canvas's
   * `cullingMask` (see `CreateUiCanvasRequiredOptions.cullingMask`) so the
   * label is actually visible through it.
   */
  labelCategory?: number;

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

export type CreateButtonOptions = CreateButtonRequiredOptions &
  Partial<CreateButtonDefaultedOptions>;

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
  options: CreateButtonOptions,
): Button {
  // Built inside the function body (rather than as a shared module-level
  // default) since it references `Color.black`, and `rendering` and `ui`
  // participate in a load-time import cycle - resolving that reference
  // eagerly at this module's own top level can run before `rendering`'s
  // `Color` export exists yet. See `sprite-component.ts`'s
  // `defaultSpriteOptions` for the same pattern.
  const defaultCreateButtonOptions = {
    anchor: UiAnchor.center,
    sizeOrMargin: { x: 200, y: 60 },
    labelColor: Color.black,
  };

  const {
    anchor,
    anchoredPosition,
    sizeOrMargin,
    labelMaxWidth,
    sprite,
    slices,
    label,
    fontAtlas,
    labelSize,
    labelColor,
    labelCategory,
    interactable: interactableOptions,
    transition: transitionOptions,
  } = { ...defaultCreateButtonOptions, ...options };

  const entity = createPanel(world, parent, {
    anchor,
    ...(anchoredPosition && { anchoredPosition }),
    sizeOrMargin,
    sprite,
    slices,
  });

  const interactable = addUiInteractableComponent(
    world,
    entity,
    interactableOptions,
  );
  addUiColorTransitionComponent(world, entity, transitionOptions);

  // `horizontalAlign: 'center'` re-centers each line within `maxWidth` (see
  // `createLabel`'s own doc comment). `UiAnchor.middleLeft` (a point
  // anchor) puts the label's own `x = 0` at the button's left edge, so
  // `maxWidth: sizeOrMargin.x` - already known statically here, since a point
  // anchor's `sizeOrMargin` is a literal size - is the button's actual width
  // with no per-frame resolved-rect lookup needed, unlike a stretch anchor.
  // Letting the engine recompute the label's position from
  // `maxWidth`/`horizontalAlign` - rather than pre-measuring the label's
  // shaped width once and baking in a fixed offset - keeps the label
  // centered even when its `text` changes later (e.g. `createDropdown`
  // swapping the header label to a different option), since
  // `createTextShapingEcsSystem` re-shapes on every text change.
  const labelEntity = createLabel(world, entity, {
    text: label,
    fontAtlas,
    size: labelSize,
    anchor: UiAnchor.middleLeft,
    maxWidth: labelMaxWidth ?? sizeOrMargin.x,
    horizontalAlign: textHorizontalAlignments.center,
    verticalAlign: 'middle',
    color: labelColor,
    ...(labelCategory !== undefined && { category: labelCategory }),
  });

  return {
    entity,
    label: labelEntity,
    interactable,
    onInvoke: interactable.onInvoke,
  };
}
