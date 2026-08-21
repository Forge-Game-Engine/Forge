import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { clamp } from '../../math/index.js';

/**
 * Fields of {@link UiProgressBarEcsComponent} with no sensible default;
 * callers must always provide these.
 */
export interface UiProgressBarRequiredOptions {
  /**
   * The entity id of the fill visual - a child `RectTransformEcsComponent`
   * stretch-anchored from the bar's left edge, whose `anchorMax.x`
   * `createUiProgressBarEcsSystem` drives to track `value` every tick.
   */
  fill: number;
}

/**
 * Fields of {@link UiProgressBarEcsComponent} with a sensible default;
 * callers may omit these.
 */
export interface UiProgressBarDefaultedOptions {
  /** The value `value` maps to an empty bar. Defaults to `0`. */
  minValue: number;

  /** The value `value` maps to a full bar. Defaults to `1`. */
  maxValue: number;

  /** The bar's current value, clamped to `[minValue, maxValue]`. Defaults to `minValue`. */
  value: number;
}

/**
 * A read-only fill indicator - health bars, loading bars, cooldowns. Unlike
 * `UiSliderEcsComponent`, it has no `UiInteractableEcsComponent` counterpart
 * and no `onValueChanged` event: `value` is meant to be driven entirely by
 * game code (`progressBar.value = hp / maxHp`), which already knows when it
 * changed and doesn't need to be told. Use `createProgressBar` for the
 * common "track + fill" visual assembly, or build your own from these same
 * pieces.
 */
export interface UiProgressBarEcsComponent
  extends UiProgressBarRequiredOptions, UiProgressBarDefaultedOptions {}

export const uiProgressBarId =
  createComponentId<UiProgressBarEcsComponent>('uiProgressBar');

const defaultUiProgressBarOptions: Omit<
  UiProgressBarDefaultedOptions,
  'value'
> = {
  minValue: 0,
  maxValue: 1,
};

/**
 * Attaches a {@link UiProgressBarEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the progress bar. `fill` has no
 * sensible default and must always be provided; `value` defaults to
 * `minValue`.
 * @returns The attached component, for reading/setting `value` directly.
 */
export function addUiProgressBarComponent(
  world: EcsWorld,
  entity: number,
  options: UiProgressBarRequiredOptions &
    Partial<UiProgressBarDefaultedOptions>,
): UiProgressBarEcsComponent {
  const merged = { ...defaultUiProgressBarOptions, ...options };
  const value = clamp(
    options.value ?? merged.minValue,
    merged.minValue,
    merged.maxValue,
  );

  const component: UiProgressBarEcsComponent = { ...merged, value };

  return world.addComponent(entity, uiProgressBarId, component);
}

/**
 * Normalizes `progressBar.value` to a `0`-`1` fraction of the way from
 * `minValue` to `maxValue` - the anchor fraction
 * `createUiProgressBarEcsSystem` drives the fill visual with.
 * @param progressBar - The progress bar's `value`/`minValue`/`maxValue`.
 * @returns The normalized fraction, clamped to `[0, 1]`. `0` if `minValue`
 * and `maxValue` coincide (a zero-length range has no meaningful fraction).
 */
export function normalizeUiProgressBarValue(
  progressBar: Pick<
    UiProgressBarEcsComponent,
    'value' | 'minValue' | 'maxValue'
  >,
): number {
  const range = progressBar.maxValue - progressBar.minValue;

  return range > 0
    ? clamp((progressBar.value - progressBar.minValue) / range, 0, 1)
    : 0;
}
