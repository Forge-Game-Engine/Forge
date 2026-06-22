import { linear } from '../easing-functions/index.js';
import { createComponentId } from '../../ecs/ecs-component.js';

/**
 * Represents the properties of an animated object.
 */
export interface AnimatedProperty {
  /**
   * The starting value of the animation.
   */
  startValue?: number;

  /**
   * The ending value of the animation.
   */
  endValue?: number;

  /**
   * The elapsed time of the animation.
   */
  elapsed?: number;

  /**
   * The duration of the animation in milliseconds.
   */
  duration: number;

  /**
   * The callback function to update the animated value.
   */
  updateCallback: (value: number) => void;

  /**
   * The easing function to use for the animation.
   */
  easing?: (t: number) => number;

  /**
   * The loop mode of the animation.
   */
  loop?: LoopMode;

  /**
   * The number of times the animation should loop. -1 means that it will loop indefinitely.
   */
  loopCount?: number;

  /**
   * The callback function to call when the animation is finished.
   */
  finishedCallback?: () => void;

  /**
   * Optional identifier used to cancel or replace an in-flight animation for
   * the same logical property. When {@link createAnimatedProperty} is called
   * without a tag the empty string `''` is used as the default, which is
   * treated as "no tag" by helpers such as {@link cancelUiPropertyAnimation}.
   */
  tag?: string;
}

/**
 * Controls how an animated property behaves once it reaches `endValue`.
 *
 * - `'none'`: the animation stops and is removed.
 * - `'loop'`: `elapsed` resets to `0` and the animation restarts from `startValue`.
 * - `'pingpong'`: `elapsed` resets to `0` and `startValue`/`endValue` are swapped, so the animation plays in reverse on the next iteration.
 */
export type LoopMode = 'none' | 'loop' | 'pingpong';

/**
 * ECS-style component interface for animations.
 */
export interface AnimationEcsComponent {
  /**
   * The animated properties currently running on this entity.
   */
  animations: Required<AnimatedProperty>[];
}

/**
 * Component key for {@link AnimationEcsComponent}.
 */
export const animationId =
  createComponentId<AnimationEcsComponent>('animation');

/**
 * Default values applied to any {@link AnimatedProperty} field not provided to {@link createAnimatedProperty}.
 */
export const animationDefaults = {
  startValue: 0,
  endValue: 1,
  elapsed: 0,
  easing: linear,
  loop: 'none' as LoopMode,
  loopCount: -1,
  finishedCallback: (): void => undefined,
  tag: '',
};

/**
 * Fills in {@link animationDefaults} for any field not provided, producing a fully populated animated property ready to push onto {@link AnimationEcsComponent.animations}.
 * @param animatedProperty - The animated property to apply defaults to.
 * @returns The animated property with all optional fields populated.
 */
export const createAnimatedProperty = (
  animatedProperty: AnimatedProperty,
): Required<AnimatedProperty> => ({
  ...animationDefaults,
  ...animatedProperty,
});
