import {
  addParentComponent,
  addPositionComponent,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { ParameterizedForgeEvent } from '../../events/index.js';
import { Vec2, Vector2 } from '../../math/index.js';
import {
  addSpriteComponent,
  NineSliceOptions,
  SpriteEcsComponent,
} from '../../rendering/index.js';
import { addRectTransformComponent } from '../components/rect-transform-component.js';
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
import { UiAnchor, UiAnchorPreset } from '../types/ui-anchor.js';
import { createPanel } from './create-panel.js';

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
  /** The anchor/pivot preset to place the track with. Defaults to `UiAnchor.center`. */
  anchor: UiAnchorPreset;

  /** Offset of the track's pivot from its anchor reference point, in reference pixels. */
  anchoredPosition?: Vector2;

  /** The track's size in reference pixels when point-anchored; a margin relative to the anchor rect when stretched. Defaults to `300x24`. */
  sizeDelta: Vector2;

  /** Overrides `trackSprite.slices` for the track. */
  slices?: NineSliceOptions;

  /** The handle's size in reference pixels. Defaults to `24x24`. */
  handleSize: Vector2;

  /**
   * The sprite to draw an optional fill visual with - a child rect
   * stretch-anchored from the track's left edge to the handle's position.
   * Omitted, the slider has no fill visual (just a track and a handle).
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
   * moves the handle.
   */
  interactable?: Partial<UiInteractableDefaultedOptions>;
}

export type CreateSliderOptions = CreateSliderRequiredOptions &
  Partial<CreateSliderDefaultedOptions>;

export interface Slider {
  /** The slider's root entity - the track - a `RectTransformEcsComponent` + `SpriteEcsComponent` + `UiInteractableEcsComponent` + `UiSliderEcsComponent`. */
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
 * a `UiInteractableEcsComponent` and a `UiSliderEcsComponent` added, plus a
 * child handle (and, if `fillSprite` is given, a child fill) whose rect
 * transforms `createUiSliderEcsSystem` drives from the slider's value every
 * tick. The whole track is the drag surface - clicking anywhere on it, not
 * just the handle, jumps the handle there.
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
    anchor: UiAnchor.center,
    sizeDelta: { x: 300, y: 24 },
    handleSize: { x: 24, y: 24 },
    minValue: 0,
    maxValue: 1,
    wholeNumbers: false,
  };

  const {
    anchor,
    anchoredPosition,
    sizeDelta,
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
  } = { ...defaultCreateSliderOptions, ...options };

  const entity = createPanel(world, parent, {
    anchor,
    ...(anchoredPosition && { anchoredPosition }),
    sizeDelta,
    sprite: trackSprite,
    slices,
  });

  const interactable = addUiInteractableComponent(world, entity, {
    dragThreshold: 0,
    ...interactableOptions,
  });

  let fill: number | undefined;

  if (fillSprite) {
    fill = world.createEntity();

    addPositionComponent(world, fill);
    addParentComponent(world, fill, { parent: entity });
    addRectTransformComponent(world, fill, {
      anchorMin: { x: 0, y: 0 },
      anchorMax: { x: 0, y: 1 },
      pivot: { x: 0, y: 0.5 },
      sizeDelta: { x: 0, y: 0 },
    });
    addSpriteComponent(world, fill, {
      ...fillSprite,
      pivot: Vec2.clone(fillSprite.pivot),
      uvOffset: Vec2.clone(fillSprite.uvOffset),
      uvScale: Vec2.clone(fillSprite.uvScale),
    });
  }

  const handle = world.createEntity();

  addPositionComponent(world, handle);
  addParentComponent(world, handle, { parent: entity });
  addRectTransformComponent(world, handle, {
    anchorMin: { x: 0, y: 0.5 },
    anchorMax: { x: 0, y: 0.5 },
    pivot: { x: 0.5, y: 0.5 },
    sizeDelta: handleSize,
  });
  addSpriteComponent(world, handle, {
    ...handleSprite,
    pivot: Vec2.clone(handleSprite.pivot),
    uvOffset: Vec2.clone(handleSprite.uvOffset),
    uvScale: Vec2.clone(handleSprite.uvScale),
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
  const handleRectTransform = world.getComponent(handle, rectTransformId)!;

  handleRectTransform.anchorMin.x = t;
  handleRectTransform.anchorMax.x = t;

  if (fill !== undefined) {
    world.getComponent(fill, rectTransformId)!.anchorMax.x = t;
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
