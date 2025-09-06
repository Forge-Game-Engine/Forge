import { Entity, System } from '../../ecs';
import { Time } from '../../common';
import { SpriteAnimationComponent } from '../components';
import { SpriteComponent } from '../../rendering';

/**
 * System that manages and updates sprite animations for entities, such as from sprite sheets.
 */
export class SpriteAnimationSystem extends System {
  private readonly _time: Time;

  /**
   * Creates an instance of SpriteAnimationSystem.
   * @param time - The Time instance.
   * @param animationSetManager - The AnimationSetManager instance.
   */
  constructor(time: Time) {
    super('spriteAnimation', [
      SpriteAnimationComponent.symbol,
      SpriteComponent.symbol,
    ]);

    this._time = time;
  }

  /**
   * Runs the animation system for a given entity.
   * @param entity - The entity to update animations for.
   */
  public run(entity: Entity): void {
    const spriteAnimationComponent =
      entity.getComponentRequired<SpriteAnimationComponent>(
        SpriteAnimationComponent.symbol,
      );

    const {
      currentAnimation,
      playbackSpeed,
      lastFrameChangeTimeInSeconds,
      animationController,
      animationInputs,
    } = spriteAnimationComponent;

    // Get the current animation frame
    const currentAnimationFrame = currentAnimation.getFrame(
      spriteAnimationComponent.animationFrameIndex,
    );

    // Determine if the frame is changing
    const currentFrameDurationSeconds = currentAnimationFrame.durationSeconds;

    const secondsElapsedSinceLastFrameChange =
      this._time.timeInSeconds - lastFrameChangeTimeInSeconds;

    const scaledFrameDuration = currentFrameDurationSeconds / playbackSpeed;

    const changeFrame =
      secondsElapsedSinceLastFrameChange >= scaledFrameDuration;

    const endOfAnimation =
      changeFrame &&
      spriteAnimationComponent.animationFrameIndex >=
        currentAnimation.frames.length - 1;

    const nextAnimation = animationController.findNextAnimation(
      currentAnimation,
      animationInputs,
      endOfAnimation,
    );

    if (endOfAnimation && !nextAnimation) {
      throw new Error(
        'Something went wrong: No next animation was found at the end of the animation.',
      );
    }

    // change animations
    if (nextAnimation) {
      if (endOfAnimation) {
        currentAnimation.onAnimationEndEvent.raise(entity);
      }

      nextAnimation.onAnimationStartEvent.raise(entity);
      spriteAnimationComponent.currentAnimation = nextAnimation;
      spriteAnimationComponent.animationFrameIndex = 0;

      return;
    }

    // go to the next animation frame
    if (!changeFrame) {
      return;
    }

    currentAnimation.onAnimationFrameChangeEvent.raise([
      entity,
      currentAnimationFrame,
    ]);

    spriteAnimationComponent.lastFrameChangeTimeInSeconds =
      this._time.timeInSeconds;

    spriteAnimationComponent.animationFrameIndex++;
  }
}
