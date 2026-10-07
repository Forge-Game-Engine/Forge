import { linear } from '../easing-functions/index.js';
import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { withDefaults } from '../../utilities/with-defaults.js';

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
   * The elapsed time of the animation, in milliseconds. The animation system
   * adds `time.deltaTimeInMilliseconds` to it on every update, and sets it
   * back to `0` when a looping animation restarts.
   */
  elapsed?: number;

  /**
   * The duration of the animation in milliseconds.
   */
  duration: number;

  /**
   * The callback function to update the animated value. Called on every
   * update with the eased value between `startValue` and `endValue`. On the
   * update that completes an iteration it's called again with `endValue`,
   * and, when the animation loops, once more with the next iteration's
   * `startValue`.
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
   * The number of times a looping animation plays again after its first
   * iteration. The animation system decrements it on each restart. -1 means
   * that it will loop indefinitely.
   */
  loopCount?: number;

  /**
   * The callback function to call when the animation is finished and
   * removed from `animations`. A looping animation calls it only after its
   * last iteration.
   */
  finishedCallback?: () => void;
}

/**
 * Controls how an animated property behaves once it reaches `endValue`.
 *
 * - `'none'`: the animation stops and is removed.
 * - `'loop'`: `elapsed` resets to `0` and the animation restarts from `startValue`.
 * - `'pingpong'`: `elapsed` resets to `0` and `startValue`/`endValue` are swapped on the animated property, so the animation plays in reverse on the next iteration.
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

/**
 * Attaches a {@link AnimationEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the animation.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addAnimationComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<AnimationEcsComponent> = {},
): AnimationEcsComponent {
  // `animations` defaults to a fresh array per call (rather than a shared
  // module-level default) since it's mutated in place by callers.
  const defaultAnimationOptions: AnimationEcsComponent = {
    animations: [],
  };

  const component: AnimationEcsComponent = withDefaults(
    defaultAnimationOptions,
    options,
  );

  return world.addComponent(entity, animationId, component);
}
