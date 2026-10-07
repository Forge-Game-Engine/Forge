import { addPositionComponent } from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vector2 } from '../../math/index.js';
import {
  addMaskComponent,
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
import { UiAnchor, UiAnchorConfig } from '../types/ui-anchor.js';
import { UiFillShape } from '../types/ui-fill-shape.js';
import { createPanel } from './create-panel.js';

/**
 * Fields of {@link CreateProgressBarOptions} with no sensible default;
 * callers must always provide these.
 */
export interface CreateProgressBarRequiredOptions {
  /** The sprite to draw the bar's background/track with, e.g. from `createImageSprite`. */
  trackSprite: SpriteEcsComponent;

  /**
   * The sprite to draw the fill with. It covers the whole bar and is
   * revealed by `fillShape`, so a nine-slice fill keeps its end caps.
   */
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

  /**
   * How the fill is revealed as the value rises: a linear fill from one
   * edge, or a radial fill around the bar's center (a ring or a cooldown).
   * Defaults to a linear fill from the left.
   */
  fillShape: UiFillShape;
}

export type CreateProgressBarOptions = CreateProgressBarRequiredOptions &
  Partial<CreateProgressBarDefaultedOptions>;

export interface ProgressBar {
  /** The bar's root entity - the track - a `RectTransformEcsComponent` + `SpriteEcsComponent`. */
  entity: number;

  /** The child fill entity, covering the bar, with its sprite and mask. */
  fill: number;

  /** The bar's `UiProgressBarEcsComponent`, for reading/setting `value` directly. */
  progressBar: UiProgressBarEcsComponent;
}

/**
 * Creates a progress bar: a panel (see `createPanel`) used as the
 * background/track, plus a child fill covering it, revealed by a
 * `MaskEcsComponent` whose amount `createUiProgressBarEcsSystem` sets from
 * `value` every tick. Children added to the fill (a label) are revealed
 * with it. Purely
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
  const defaultCreateProgressBarOptions: Pick<
    CreateProgressBarDefaultedOptions,
    'anchor' | 'minValue' | 'maxValue' | 'fillShape'
  > = {
    anchor: UiAnchor.center({ x: 300, y: 24 }),
    minValue: 0,
    maxValue: 1,
    fillShape: { kind: 'linear', origin: 'left' },
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
    fillShape,
  } = { ...defaultCreateProgressBarOptions, ...options };

  const entity = createPanel(world, parent, {
    anchor,
    ...(anchoredPosition && { anchoredPosition }),
    sprite: trackSprite,
    slices,
  });

  const fill = world.createEntity();

  addPositionComponent(world, fill);
  world.setParent(fill, entity);
  addRectTransformComponent(world, fill, UiAnchor.stretchAll());
  addSpriteComponent(world, fill, {
    ...fillSprite,
  });

  const progressBar = addUiProgressBarComponent(world, entity, {
    fill,
    minValue,
    maxValue,
    ...(value !== undefined && { value }),
  });

  // The layout system sizes the mask to the fill's rect.
  addMaskComponent(world, fill, {
    width: fillSprite.width,
    height: fillSprite.height,
    shape: { ...fillShape, amount: normalizeUiProgressBarValue(progressBar) },
  });

  return { entity, fill, progressBar };
}
