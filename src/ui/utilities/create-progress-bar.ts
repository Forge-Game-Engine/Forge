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
import { AnchorPivotConfig, UiAnchor } from '../types/ui-anchor.js';
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
  /** The anchor/pivot preset to place the bar with. Defaults to `UiAnchor.center`. */
  anchor: AnchorPivotConfig;

  /** Offset of the bar's pivot from its anchor reference point, in reference pixels. */
  anchoredPosition?: Vector2;

  /** Size in reference pixels when point-anchored; a margin relative to the anchor rect when stretched. Defaults to `300x24`. */
  sizeOrMargin: Vector2;

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
    anchor: UiAnchor.center,
    sizeOrMargin: { x: 300, y: 24 },
    minValue: 0,
    maxValue: 1,
  };

  const {
    anchor,
    anchoredPosition,
    sizeOrMargin,
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
    sizeOrMargin,
    sprite: trackSprite,
    slices,
  });

  const fill = world.createEntity();

  addPositionComponent(world, fill);
  addParentComponent(world, fill, { parent: entity });
  addRectTransformComponent(world, fill, {
    anchorMin: { x: 0, y: 0 },
    anchorMax: { x: 0, y: 1 },
    pivot: { x: 0, y: 0.5 },
    sizeOrMargin: { x: 0, y: 0 },
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

  world.getComponent(fill, rectTransformId)!.anchorMax.x =
    normalizeUiProgressBarValue(progressBar);

  return { entity, fill, progressBar };
}
