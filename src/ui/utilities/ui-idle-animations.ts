import { EcsWorld } from '../../ecs/ecs-world.js';
import {
  animateUiBorderWidth,
  animateUiOpacity,
  animateUiRotation,
  cancelUiPropertyAnimation,
} from './animate-ui-property.js';

/**
 * Options for {@link startCaretBlink}.
 */
export interface CaretBlinkOptions {
  /**
   * Total period of one blink cycle (on→off→on) in milliseconds.
   * Default `1000`.
   */
  period?: number;
  /**
   * Opacity at the dim end of each half-cycle. Default `0`.
   */
  minOpacity?: number;
}

/**
 * Starts a continuous caret-blink animation on the entity by ping-ponging
 * opacity between `1` and `minOpacity` indefinitely.
 *
 * Uses the `'ui.opacity'` tag, so any concurrent opacity animation (e.g. a
 * state transition on blur) will cancel the blink. Restart it in the `onFocus`
 * handler if desired.
 *
 * Returns a stop function that cancels the animation.
 *
 * @param world - The ECS world.
 * @param entity - The caret entity (must have {@link UiRenderableEcsComponent}).
 * @param options - Period and minimum opacity.
 * @returns A function that stops the blink animation.
 */
export function startCaretBlink(
  world: EcsWorld,
  entity: number,
  options?: CaretBlinkOptions,
): () => void {
  const { period = 1000, minOpacity = 0 } = options ?? {};

  animateUiOpacity(world, entity, {
    from: 1,
    to: minOpacity,
    duration: period / 2,
    loop: 'pingpong',
    loopCount: -1,
  });

  return () => cancelUiPropertyAnimation(world, entity, 'ui.opacity');
}

/**
 * Options for {@link startFocusPulse}.
 */
export interface FocusPulseOptions {
  /**
   * Duration of one pulse (expand→contract) in milliseconds. Default `1500`.
   */
  period?: number;
  /**
   * Maximum border width at the peak of each pulse in pixels. Default `3`.
   */
  maxBorderWidth?: number;
}

/**
 * Starts a continuous focus-ring pulse by ping-ponging `borderWidth` between
 * its current value and `maxBorderWidth` indefinitely.
 *
 * Returns a stop function that cancels the animation.
 *
 * @param world - The ECS world.
 * @param entity - The entity to pulse (must have {@link UiRenderableEcsComponent}).
 * @param options - Period and maximum border width.
 * @returns A function that stops the pulse animation.
 */
export function startFocusPulse(
  world: EcsWorld,
  entity: number,
  options?: FocusPulseOptions,
): () => void {
  const { period = 1500, maxBorderWidth = 3 } = options ?? {};

  animateUiBorderWidth(world, entity, {
    to: maxBorderWidth,
    duration: period / 2,
    loop: 'pingpong',
    loopCount: -1,
  });

  return () => cancelUiPropertyAnimation(world, entity, 'ui.borderWidth');
}

/**
 * Options for {@link startLoadingSpinner}.
 */
export interface LoadingSpinnerOptions {
  /**
   * Duration of one full rotation (0 → 2π) in milliseconds. Default `800`.
   */
  period?: number;
}

/**
 * Starts a continuous loading-spinner animation by looping `rotation` from
 * `0` to `2π` indefinitely.
 *
 * Returns a stop function that cancels the animation.
 *
 * @param world - The ECS world.
 * @param entity - The spinner entity (must have {@link UiTransformEcsComponent}).
 * @param options - Period in milliseconds.
 * @returns A function that stops the spinner animation.
 */
export function startLoadingSpinner(
  world: EcsWorld,
  entity: number,
  options?: LoadingSpinnerOptions,
): () => void {
  const { period = 800 } = options ?? {};

  animateUiRotation(world, entity, {
    from: 0,
    to: Math.PI * 2,
    duration: period,
    loop: 'loop',
    loopCount: -1,
  });

  return () => cancelUiPropertyAnimation(world, entity, 'ui.rotation');
}
