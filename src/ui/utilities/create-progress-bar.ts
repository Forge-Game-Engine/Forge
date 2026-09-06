import {
  addParentComponent,
  addPositionComponent,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vec2, Vector2 } from '../../math/index.js';
import {
  addSpriteComponent,
  NineSliceOptions,
  SpriteEcsComponent,
} from '../../rendering/index.js';
import { addRectTransformComponent } from '../components/rect-transform-component.js';
import {
  addUiProgressBarComponent,
  normalizeUiProgressBarValue,
  UiProgressBarEcsComponent,
} from '../components/ui-progress-bar-component.js';
import { rectTransformId } from '../components/rect-transform-component.js';
import { UiAnchor, UiAnchorConfig } from '../types/ui-anchor.js';
import { driveUiAxis, UiAxis } from '../types/ui-axis.js';
import { createPanel } from './create-panel.js';

/**
 * Fields of {@link CreateProgressBarOptions} with no sensible default;
 * callers must always provide these.
 */
export interface CreateProgressBarRequiredOptions {
  /** The sprite to draw the bar's background/track with, e.g. from `createImageSprite`. */
  trackSprite: SpriteEcsComponent;

  /** The sprite to draw the fill with. */
  fillSprite: SpriteEcsComponent;
}

/**
 * Fields of {@link CreateProgressBarOptions} with a sensible default;
 * callers may omit these.
 */
export interface CreateProgressBarDefaultedOptions {
  /**
   * The anchor to place the bar with - see `UiAnchor` for common presets
   * (e.g. `UiAnchor.center({ x: 300, y: 24 })`). Defaults to
   * `UiAnchor.center({ x: 300, y: 24 })`.
   */
  anchor: UiAnchorConfig;

  /** Offset of the bar's pivot from its anchor reference point, in reference pixels. */
  anchoredPosition?: Vector2;

  /** Overrides `trackSprite.slices` for the track. */
  slices?: NineSliceOptions;

  /** The value `value` maps to an empty bar. Defaults to `0`. */
  minValue: number;

  /** The value `value` maps to a full bar. Defaults to `1`. */
  maxValue: number;

  /** The bar's initial value, clamped to `[minValue, maxValue]`. Defaults to `minValue`. */
  value: number;
}

export type CreateProgressBarOptions = CreateProgressBarRequiredOptions &
  Partial<CreateProgressBarDefaultedOptions>;

export interface ProgressBar {
  /** The bar's root entity - the track - a `RectTransformEcsComponent` + `SpriteEcsComponent`. */
  entity: number;

  /** The child fill entity. */
  fill: number;

  /** The bar's `UiProgressBarEcsComponent`, for reading/setting `value` directly. */
  progressBar: UiProgressBarEcsComponent;
}

/**
 * Creates a progress bar: a panel (see `createPanel`) used as the
 * background/track, plus a child fill panel whose rect transform
 * `createUiProgressBarEcsSystem` drives from `value` every tick. Purely
 * visual - unlike `createSlider`, no `UiInteractableEcsComponent` is added,
 * since a progress bar reports state rather than accepting input.
 * @param world - The ECS world to create the progress bar entity in.
 * @param parent - The parent entity - a canvas (see `createUiCanvas`) or
 * another UI element.
 * @param options - Options for configuring the progress bar. `trackSprite`
 * and `fillSprite` have no sensible default and must always be provided.
 * @returns The created progress bar: its track entity, its child fill
 * entity, and its `UiProgressBarEcsComponent`.
 */
export function createProgressBar(
  world: EcsWorld,
  parent: number,
  options: CreateProgressBarOptions,
): ProgressBar {
  const defaultCreateProgressBarOptions = {
    anchor: UiAnchor.center({ x: 300, y: 24 }),
    minValue: 0,
    maxValue: 1,
  };

  const {
    anchor,
    anchoredPosition,
    trackSprite,
    slices,
    fillSprite,
    minValue,
    maxValue,
    value,
  } = { ...defaultCreateProgressBarOptions, ...options };

  const entity = createPanel(world, parent, {
    anchor,
    ...(anchoredPosition && { anchoredPosition }),
    sprite: trackSprite,
    slices,
  });

  const fill = world.createEntity();

  addPositionComponent(world, fill);
  addParentComponent(world, fill, { parent: entity });
  addRectTransformComponent(world, fill, {
    // A stretch axis rather than a point one even though it starts at zero
    // width (`anchorMin.x == anchorMax.x == 0` here) - `x.anchorMax` is
    // driven up to the bar's normalized value below and every tick by
    // `createUiProgressBarEcsSystem`, growing the fill as a genuine stretch
    // span rather than ever becoming a literal size.
    x: UiAxis.stretch({ min: 0, max: 0 }, { pivot: 0 }),
    y: UiAxis.stretch({ min: 0, max: 1 }),
  });
  addSpriteComponent(world, fill, {
    ...fillSprite,
    pivot: Vec2.clone(fillSprite.pivot),
    uvOffset: Vec2.clone(fillSprite.uvOffset),
    uvScale: Vec2.clone(fillSprite.uvScale),
  });

  const progressBar = addUiProgressBarComponent(world, entity, {
    fill,
    minValue,
    maxValue,
    ...(value !== undefined && { value }),
  });

  driveUiAxis(
    world.getComponent(fill, rectTransformId)!.x,
    normalizeUiProgressBarValue(progressBar),
  );

  return { entity, fill, progressBar };
}
