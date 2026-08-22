import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { ParameterizedForgeEvent } from '../../events/index.js';
import { clamp, lerp } from '../../math/index.js';

/**
 * Fields of {@link UiSliderEcsComponent} with no sensible default; callers
 * must always provide these.
 */
export interface UiSliderRequiredOptions {
  /**
   * The entity id of the slider's drag handle - a child `RectTransformEcsComponent`
   * whose `anchorMin.x`/`anchorMax.x` `createUiSliderEcsSystem` drives to
   * track `value` every tick.
   */
  handle: number;
}

/**
 * Fields of {@link UiSliderEcsComponent} with a sensible default, or that are
 * genuinely optional (no default at all); callers may omit these.
 */
export interface UiSliderDefaultedOptions {
  /** The value `value` maps to at the track's left edge. Defaults to `0`. */
  minValue: number;

  /** The value `value` maps to at the track's right edge. Defaults to `1`. */
  maxValue: number;

  /** The slider's current value, clamped to `[minValue, maxValue]`. Defaults to `minValue`. */
  value: number;

  /** Rounds `value` to the nearest whole number whenever it's set by a drag. Defaults to `false`. */
  wholeNumbers: boolean;

  /**
   * The entity id of an optional fill visual - a child `RectTransformEcsComponent`
   * stretch-anchored from the track's left edge, whose `anchorMax.x`
   * `createUiSliderEcsSystem` drives to track `value` every tick.
   */
  fill?: number;
}

/**
 * A horizontal drag track holding a numeric value between `minValue` and
 * `maxValue`. Attach alongside a `UiInteractableEcsComponent` (the drag
 * surface `createUiSliderEcsSystem` reads pointer position against) and a
 * `RectTransformEcsComponent`; use `createSlider` for the common "track +
 * handle + fill" visual assembly, or build your own from these same pieces.
 */
export interface UiSliderEcsComponent
  extends UiSliderRequiredOptions, UiSliderDefaultedOptions {
  /**
   * Raised whenever `value` changes - by a drag, or by a direct
   * `slider.value =` write followed by `createUiSliderEcsSystem`'s next tick
   * re-deriving the handle/fill visuals from it. Passes the new value.
   */
  readonly onValueChanged: ParameterizedForgeEvent<number>;
}

export const uiSliderId = createComponentId<UiSliderEcsComponent>('uiSlider');

const defaultUiSliderOptions: Omit<UiSliderDefaultedOptions, 'value' | 'fill'> =
  {
    minValue: 0,
    maxValue: 1,
    wholeNumbers: false,
  };

/**
 * Attaches a {@link UiSliderEcsComponent} to `entity`. Needs a
 * `UiInteractableEcsComponent` on the same entity for
 * `createUiSliderEcsSystem` to read drag gestures from.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the slider. `handle` has no
 * sensible default and must always be provided; `value` defaults to
 * `minValue`.
 * @returns The attached component, for further tuning, listening to
 * `onValueChanged`, or reading/setting `value` directly.
 */
export function addUiSliderComponent(
  world: EcsWorld,
  entity: number,
  options: UiSliderRequiredOptions & Partial<UiSliderDefaultedOptions>,
): UiSliderEcsComponent {
  const merged = { ...defaultUiSliderOptions, ...options };
  const value = clamp(
    options.value ?? merged.minValue,
    merged.minValue,
    merged.maxValue,
  );

  const component: UiSliderEcsComponent = {
    ...merged,
    value,
    onValueChanged: new ParameterizedForgeEvent('uiSlider.onValueChanged'),
  };

  return world.addComponent(entity, uiSliderId, component);
}

/**
 * Normalizes `slider.value` to a `0`-`1` fraction of the way from `minValue`
 * to `maxValue` - the anchor fraction `createUiSliderEcsSystem` drives the
 * handle/fill visuals with.
 * @param slider - The slider's `value`/`minValue`/`maxValue`.
 * @returns The normalized fraction, clamped to `[0, 1]`. `0` if `minValue`
 * and `maxValue` coincide (a zero-length range has no meaningful fraction).
 */
export function normalizeUiSliderValue(
  slider: Pick<UiSliderEcsComponent, 'value' | 'minValue' | 'maxValue'>,
): number {
  const range = slider.maxValue - slider.minValue;

  return range > 0 ? clamp((slider.value - slider.minValue) / range, 0, 1) : 0;
}

/**
 * Converts a `0`-`1` fraction back into a value in `[minValue, maxValue]`,
 * rounding to the nearest whole number when `wholeNumbers` is set - the
 * inverse of `normalizeUiSliderValue`, used by `createUiSliderEcsSystem` to
 * turn a drag position back into a value.
 * @param slider - The slider's `minValue`/`maxValue`/`wholeNumbers`.
 * @param t - The normalized fraction, clamped to `[0, 1]` before use.
 * @returns The denormalized value.
 */
export function denormalizeUiSliderValue(
  slider: Pick<UiSliderEcsComponent, 'minValue' | 'maxValue' | 'wholeNumbers'>,
  t: number,
): number {
  const value = lerp(slider.minValue, slider.maxValue, clamp(t, 0, 1));

  return slider.wholeNumbers ? Math.round(value) : value;
}
