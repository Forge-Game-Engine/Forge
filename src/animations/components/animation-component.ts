import { linear } from '../easing-functions/index.js';
import { createComponentId } from '../../new-ecs/ecs-component.js';

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
}

export type LoopMode = 'none' | 'loop' | 'pingpong';

/**
 * ECS-style component interface for animations.
 */
export interface AnimationEcsComponent {
  animations: Required<AnimatedProperty>[];
}

export const animationId =
  createComponentId<AnimationEcsComponent>('animation');

export const animationDefaults = {
  startValue: 0,
  endValue: 1,
  elapsed: 0,
  easing: linear,
  loop: 'none' as LoopMode,
  loopCount: -1,
  finishedCallback: (): void => undefined,
};

export const createAnimatedProperty = (
  animatedProperty: AnimatedProperty,
): Required<AnimatedProperty> => ({
  ...animatedProperty,
  ...animationDefaults,
});
