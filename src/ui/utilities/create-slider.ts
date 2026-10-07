import { addPositionComponent } from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { ParameterizedForgeEvent } from '../../events/index.js';
import { Vector2 } from '../../math/index.js';
import {
  addMaskComponent,
  addSpriteComponent,
  NineSliceOptions,
  SpriteEcsComponent,
} from '../../rendering/index.js';
import { addRectTransformComponent } from '../components/rect-transform-component.js';
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
  addUiSliderComponent,
  normalizeUiSliderValue,
  UiSliderEcsComponent,
} from '../components/ui-slider-component.js';
import { rectTransformId } from '../components/rect-transform-component.js';
import { UiAnchor, UiAnchorConfig } from '../types/ui-anchor.js';
import { driveUiAxis, UiAxis } from '../types/ui-axis.js';
import { createPanel } from './create-panel.js';
import { driveUiFillMask } from './drive-ui-fill-mask.js';

/**
 * Fields of {@link CreateSliderOptions} with no sensible default; callers
 * must always provide these.
 */
export interface CreateSliderRequiredOptions {
  /** The sprite to draw the slider's track with, e.g. from `createImageSprite`. */
  trackSprite: SpriteEcsComponent;

  /** The sprite to draw the drag handle with. */
  handleSprite: SpriteEcsComponent;
}

/**
 * Fields of {@link CreateSliderOptions} with a sensible default, or that are
 * genuinely optional (no default at all); callers may omit these.
 */
export interface CreateSliderDefaultedOptions {
  /**
   * The anchor to place the track with - see `UiAnchor` for common
   * presets (e.g. `UiAnchor.center({ x: 300, y: 24 })`). Defaults to
   * `UiAnchor.center({ x: 300, y: 24 })`.
   */
  anchor: UiAnchorConfig;

  /** Offset of the track's pivot from its anchor reference point, in reference pixels. */
  anchoredPosition?: Vector2;

  /** Overrides `trackSprite.slices` for the track. */
  slices?: NineSliceOptions;

  /** The handle's size in reference pixels. Defaults to `24x24`. */
  handleSize: Vector2;

  /**
   * The sprite to draw an optional fill visual with: a child covering the
   * track, revealed from the left edge up to the handle by a linear
   * `MaskEcsComponent`, so a nine-slice fill keeps its end caps. Omitted,
   * the slider has no fill visual (just a track and a handle).
   */
  fillSprite?: SpriteEcsComponent;

  /** The value `value` maps to at the track's left edge. Defaults to `0`. */
  minValue: number;

  /** The value `value` maps to at the track's right edge. Defaults to `1`. */
  maxValue: number;

  /** The slider's initial value, clamped to `[minValue, maxValue]`. Defaults to `minValue`. */
  value: number;

  /** Rounds `value` to the nearest whole number whenever it's set by a drag. Defaults to `false`. */
  wholeNumbers: boolean;

  /**
   * Overrides for the track's `UiInteractableEcsComponent`. `dragThreshold`
   * defaults to `0` here (rather than `UiInteractableEcsComponent`'s own
   * default of `8`), so any drag at all - not just one past a dead zone -
   * moves the handle, and `receivesDrag` to `true`, so a slider inside a
   * scroll view keeps its drags instead of scrolling the view.
   */
  interactable?: Partial<UiInteractableDefaultedOptions>;

  /**
   * Overrides for the track's `UiColorTransitionEcsComponent` (its
   * hover/pressed/disabled tints, transition duration, and easing) - the
   * only visual feedback for a slider being keyboard/gamepad-focused, since
   * the track itself has no separate "focused" decoration.
   */
  transition?: Partial<UiColorTransitionDefaultedOptions>;
}

export type CreateSliderOptions = CreateSliderRequiredOptions &
  Partial<CreateSliderDefaultedOptions>;

export interface Slider {
  /** The slider's root entity - the track - a `RectTransformEcsComponent` + `SpriteEcsComponent` + `UiInteractableEcsComponent` + `UiColorTransitionEcsComponent` + `UiSliderEcsComponent`. */
  entity: number;

  /** The child handle entity. */
  handle: number;

  /** The child fill entity, if `fillSprite` was given. */
  fill?: number;

  /** The track's `UiInteractableEcsComponent`, for reading interaction state or registering pointer-event listeners. */
  interactable: UiInteractableEcsComponent;

  /** The slider's `UiSliderEcsComponent`, for reading/setting `value` directly. */
  slider: UiSliderEcsComponent;

  /**
   * Raised whenever `value` changes - `slider.onValueChanged`, surfaced
   * directly since registering a single listener on it is the overwhelmingly
   * common case.
   */
  onValueChanged: ParameterizedForgeEvent<number>;
}

/**
 * Creates a slider: a panel (see `createPanel`) used as the drag track, with
 * a `UiInteractableEcsComponent`, a `UiColorTransitionEcsComponent`, and a
 * `UiSliderEcsComponent` added, plus a child handle whose rect transform
 * `createUiSliderEcsSystem` drives from the slider's value every tick (and,
 * if `fillSprite` is given, a child fill covering the track, whose mask it
 * reveals up to the handle). The whole track is the drag
 * surface - clicking anywhere on it, not just the handle, jumps the handle
 * there.
 * @param world - The ECS world to create the slider entity in.
 * @param parent - The parent entity - a canvas (see `createUiCanvas`) or
 * another UI element.
 * @param options - Options for configuring the slider. `trackSprite` and
 * `handleSprite` have no sensible default and must always be provided.
 * @returns The created slider: its track entity, its child handle (and fill,
 * if any) entity, its `UiInteractableEcsComponent`, its
 * `UiSliderEcsComponent`, and `onValueChanged` for the common case of
 * registering a single listener.
 */
export function createSlider(
  world: EcsWorld,
  parent: number,
  options: CreateSliderOptions,
): Slider {
  const defaultCreateSliderOptions = {
    anchor: UiAnchor.center({ x: 300, y: 24 }),
    handleSize: { x: 24, y: 24 },
    minValue: 0,
    maxValue: 1,
    wholeNumbers: false,
  };

  const {
    anchor,
    anchoredPosition,
    trackSprite,
    slices,
    handleSprite,
    handleSize,
    fillSprite,
    minValue,
    maxValue,
    value,
    wholeNumbers,
    interactable: interactableOptions,
    transition: transitionOptions,
  } = { ...defaultCreateSliderOptions, ...options };

  const entity = createPanel(world, parent, {
    anchor,
    ...(anchoredPosition && { anchoredPosition }),
    sprite: trackSprite,
    slices,
  });

  const interactable = addUiInteractableComponent(world, entity, {
    dragThreshold: 0,
    receivesDrag: true,
    ...interactableOptions,
  });
  addUiColorTransitionComponent(world, entity, transitionOptions);

  let fill: number | undefined;

  if (fillSprite) {
    fill = world.createEntity();

    addPositionComponent(world, fill);
    world.setParent(fill, entity);
    addRectTransformComponent(world, fill, UiAnchor.stretchAll());
    addSpriteComponent(world, fill, {
      ...fillSprite,
    });
    // The layout system sizes the mask to the fill's rect, and
    // `createUiSliderEcsSystem` sets its amount from the slider's value.
    addMaskComponent(world, fill, {
      width: fillSprite.width,
      height: fillSprite.height,
      shape: { kind: 'linear', origin: 'left', amount: 0 },
    });
  }

  const handle = world.createEntity();

  addPositionComponent(world, handle);
  world.setParent(handle, entity);
  addRectTransformComponent(world, handle, {
    // `x.anchor` is driven to the slider's normalized value below and every
    // tick by `createUiSliderEcsSystem`, sliding the handle along the track.
    x: UiAxis.point(0, { pivot: 0.5, size: handleSize.x }),
    y: UiAxis.point(0.5, { size: handleSize.y }),
  });
  addSpriteComponent(world, handle, {
    ...handleSprite,
  });

  const slider = addUiSliderComponent(world, entity, {
    handle,
    ...(fill !== undefined && { fill }),
    minValue,
    maxValue,
    ...(value !== undefined && { value }),
    wholeNumbers,
  });

  const t = normalizeUiSliderValue(slider);
  const handleRectTransform = world.getComponentRequired(
    handle,
    rectTransformId,
  );

  driveUiAxis(handleRectTransform.x, t);

  if (fill !== undefined) {
    driveUiFillMask(world, fill, t, 'slider');
  }

  return {
    entity,
    handle,
    ...(fill !== undefined && { fill }),
    interactable,
    slider,
    onValueChanged: slider.onValueChanged,
  };
}
