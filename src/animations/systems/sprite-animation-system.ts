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
      playbackSpeed,
      animationSet,
      lastFrameChangeTimeInSeconds,
      animationChangeEvent,
      animationFrameChangeEvent,
    } = spriteAnimationComponent;

    const currentAnimation = animationSet.getAnimation(
      spriteAnimationComponent.animationIndex,
    );
    const currentAnimationFrame = currentAnimation.getFrame(
      spriteAnimationComponent.animationFrameIndex,
    );

    const currentFrameDurationSeconds = currentAnimationFrame.durationSeconds;

    const secondsElapsedSinceLastFrameChange =
      this._time.timeInSeconds - lastFrameChangeTimeInSeconds;

    const scaledFrameDuration = currentFrameDurationSeconds / playbackSpeed; // TODO: should we be multiplying this instead of dividing?

    if (secondsElapsedSinceLastFrameChange < scaledFrameDuration) {
      return;
    }

    spriteAnimationComponent.lastFrameChangeTimeInSeconds =
      this._time.timeInSeconds;

    if (
      spriteAnimationComponent.animationFrameIndex <
      currentAnimation.frames.length - 1
    ) {
      spriteAnimationComponent.animationFrameIndex++;
      const nextFrame = currentAnimation.getFrame(
        spriteAnimationComponent.animationFrameIndex,
      );
      animationFrameChangeEvent?.raise([entity, nextFrame]);

      return;
    }

    spriteAnimationComponent.animationIndex++;

    if (
      spriteAnimationComponent.animationIndex >= animationSet.animations.length
    ) {
      spriteAnimationComponent.animationIndex = 0;
      spriteAnimationComponent.animationFrameIndex = 0;
    }

    const nextAnimation = animationSet.getAnimation(
      spriteAnimationComponent.animationIndex,
    );
    animationChangeEvent?.raise([entity, nextAnimation]);
  }
}
