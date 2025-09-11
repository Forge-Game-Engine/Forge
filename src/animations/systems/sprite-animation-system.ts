import { Entity, System } from '../../ecs';
import { Time } from '../../common';
import { SpriteAnimationComponent } from '../components';
import { SpriteComponent } from '../../rendering';
import { Animation } from '../types';

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
      entity,
      currentAnimation,
      animationInputs,
      endOfAnimation,
    );

    if (endOfAnimation && !nextAnimation) {
      throw new Error(
        `No next animation found at end of animation '${currentAnimation.name}'. Check animation controller transitions.`,
      );
    }

    // change animations
    if (nextAnimation) {
      if (endOfAnimation) {
        currentAnimation.onAnimationEndEvent.raise(entity);
      }

      spriteAnimationComponent.animationFrameIndex = 0;
      spriteAnimationComponent.currentAnimation = nextAnimation;
      nextAnimation.onAnimationStartEvent.raise(entity);

      this._onChangeAnimationFrame(
        nextAnimation,
        entity,
        spriteAnimationComponent.animationFrameIndex,
        spriteAnimationComponent,
      );

      return;
    }

    // go to the next animation frame
    if (!changeFrame) {
      return;
    }

    spriteAnimationComponent.animationFrameIndex++;

    this._onChangeAnimationFrame(
      currentAnimation,
      entity,
      spriteAnimationComponent.animationFrameIndex,
      spriteAnimationComponent,
    );
  }

  /**
   * Handles the logic when an animation frame changes, including raising events and updating the last frame change time.
   * @param animation - The current animation.
   * @param entity - The entity whose animation frame has changed.
   * @param animationFrameIndex - The index of the new animation frame.
   * @param spriteAnimationComponent - The SpriteAnimationComponent of the entity.
   */
  private _onChangeAnimationFrame(
    animation: Animation,
    entity: Entity,
    animationFrameIndex: number,
    spriteAnimationComponent: SpriteAnimationComponent,
  ) {
    const animationFrame = animation.getFrame(animationFrameIndex);

    animation.onAnimationFrameChangeEvent.raise({
      entity,
      animationFrame,
    });

    spriteAnimationComponent.lastFrameChangeTimeInSeconds =
      this._time.timeInSeconds;
  }
}
