import { Time } from '../../common/index.js';
import {
  type AnimatedProperty,
  type AnimationEcsComponent,
  animationId,
} from '../components/index.js';
import { EcsSystem } from '../../new-ecs/index.js';


/**
 * Updates a single animation.
 * @param animation - The animation to update.
 * @returns True if the animation is complete, false otherwise.
 */
const updateAnimation = (
  animation: Required<AnimatedProperty>,
  time: Time,
): boolean => {
  animation.elapsed += time.deltaTimeInMilliseconds;

  let t = animation.elapsed / animation.duration;

  if (t > 1) {
    t = 1;
  }

  const factor = animation.easing ? animation.easing(t) : t;
  const currentValue =
    animation.startValue + (animation.endValue - animation.startValue) * factor;

  animation.updateCallback(currentValue);

  return t >= 1;
};

/**
 * Handles looping for an animation.
 * @param animation - The animation to handle looping for.
 * @returns True if the animation should continue, false if it should be removed.
 */
const handleLooping = (animation: Required<AnimatedProperty>): boolean => {
  if (!animation.loop || animation.loop === 'none') {
    return false;
  }

  if (animation.loopCount > -1) {
    if (animation.loopCount === 0) {
      return false;
    }

    animation.loopCount--;
  }

  animation.elapsed = 0;

  if (animation.loop === 'loop') {
    animation.updateCallback(animation.startValue);
  } else if (animation.loop === 'pingpong') {
    // Swap start and end for next iteration
    const originalStartValue = animation.startValue;
    animation.startValue = animation.endValue;
    animation.endValue = originalStartValue;

    // Start again at the new startValue
    animation.updateCallback(animation.startValue);
  }

  return true;
};

/**
 * Creates a new ECS-style animation system.
 * @param time - The Time instance.
 * @returns An ECS system that updates animations.
 */
export const createAnimationEcsSystem = (
  time: Time,
): EcsSystem<[AnimationEcsComponent]> => ({
  query: [animationId],
  run: (result) => {
    const [animationComponent] = result.components;

    if (animationComponent.animations.length === 0) {
      return;
    }

    // Iterate backwards so we can safely remove animations
    for (let i = animationComponent.animations.length - 1; i >= 0; i--) {
      const animation = animationComponent.animations[i];
      const animationComplete = updateAnimation(animation, time);

      if (animationComplete) {
        animation.updateCallback(animation.endValue);

        const shouldRemove = !handleLooping(animation);

        if (shouldRemove) {
          animation.finishedCallback?.();
          animationComponent.animations.splice(i, 1);
        }
      }
    }
  },
});
