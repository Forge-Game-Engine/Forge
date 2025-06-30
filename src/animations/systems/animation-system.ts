import { Entity, System } from '../../ecs';
import { Time } from '../../common';
import { type AnimatedProperty, AnimationComponent } from '../components';

/**
 * System that manages and updates animations for entities.
 */
export class AnimationSystem extends System {
  private readonly _time: Time;

  /**
   * Creates an instance of AnimationSystem.
   * @param time - The Time instance.
   */
  constructor(time: Time) {
    super('animation', [AnimationComponent.symbol]);
    this._time = time;
  }

  /**
   * Runs the animation system for a given entity.
   * @param entity - The entity to update animations for.
   */
  public run(entity: Entity): void {
    const animationComponent = entity.getComponentRequired<AnimationComponent>(
      AnimationComponent.symbol,
    );

    if (animationComponent.animations.length === 0) {
      return;
    }

    const deltaTime = this._time.deltaTimeInMilliseconds;

    // Iterate backwards so we can safely remove animations
    for (let i = animationComponent.animations.length - 1; i >= 0; i--) {
      const animation = animationComponent.animations[i];
      const animationComplete = this._updateAnimation(animation, deltaTime);

      if (animationComplete) {
        animation.updateCallback(animation.endValue);

        const shouldRemove = !this._handleLooping(animation);

        if (shouldRemove) {
          animation.finishedCallback?.();
          animationComponent.animations.splice(i, 1);
        }
      }
    }
  }

  /**
   * Updates a single animation.
   * @param animation - The animation to update.
   * @param deltaTime - The time elapsed since the last update in seconds.
   * @returns True if the animation is complete, false otherwise.
   */
  private _updateAnimation(
    animation: Required<AnimatedProperty>,
    deltaTime: number,
  ): boolean {
    animation.elapsed += deltaTime;

    let t = animation.elapsed / animation.duration;

    if (t > 1) {
      t = 1;
    }

    const factor = animation.easing ? animation.easing(t) : t;
    const currentValue =
      animation.startValue +
      (animation.endValue - animation.startValue) * factor;

    animation.updateCallback(currentValue);

    return t >= 1;
  }

  /**
   * Handles looping for an animation.
   * @param animation - The animation to handle looping for.
   * @returns True if the animation should continue, false if it should be removed.
   */
  private _handleLooping(animation: Required<AnimatedProperty>): boolean {
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
  }
}
