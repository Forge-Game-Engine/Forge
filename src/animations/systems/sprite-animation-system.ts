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

    const currentAnimationFrame = currentAnimation.getFrame(
      spriteAnimationComponent.animationFrameIndex,
    );

    const secondsElapsedSinceLastFrameChange =
      this._time.timeInSeconds - lastFrameChangeTimeInSeconds;

    const scaledFrameDuration =
      currentAnimationFrame.durationSeconds / playbackSpeed;

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

    if (nextAnimation) {
      this._processAnimationChange(
        endOfAnimation,
        entity,
        spriteAnimationComponent,
        nextAnimation,
      );

      return;
    }

    if (!changeFrame) {
      return;
    }

    spriteAnimationComponent.animationFrameIndex++;

    this._onChangeAnimationFrame(
      currentAnimation,
      entity,
      spriteAnimationComponent,
    );
  }

  /**
   * Processes the change of animations, including raising events and resetting the frame index.
   * @param endOfAnimation - Whether the current animation has reached its end.
   * @param entity - The entity whose animation is changing.
   * @param spriteAnimationComponent - The SpriteAnimationComponent of the entity.
   * @param nextAnimation - The next animation to switch to.
   */
  private _processAnimationChange(
    endOfAnimation: boolean,
    entity: Entity,
    spriteAnimationComponent: SpriteAnimationComponent,
    nextAnimation: Animation,
  ) {
    if (endOfAnimation) {
      spriteAnimationComponent.currentAnimation.onAnimationEndEvent.raise(
        entity,
      );
    }

    spriteAnimationComponent.animationFrameIndex = 0;
    spriteAnimationComponent.currentAnimation = nextAnimation;
    nextAnimation.onAnimationStartEvent.raise(entity);

    this._onChangeAnimationFrame(
      nextAnimation,
      entity,
      spriteAnimationComponent,
    );
  }

  /**
   * Handles the logic when an animation frame changes, including raising events and updating the last frame change time.
   * @param animation - The current animation.
   * @param entity - The entity whose animation frame has changed.
   * @param spriteAnimationComponent - The SpriteAnimationComponent of the entity.
   */
  private _onChangeAnimationFrame(
    animation: Animation,
    entity: Entity,
    spriteAnimationComponent: SpriteAnimationComponent,
  ) {
    const animationFrame = animation.getFrame(
      spriteAnimationComponent.animationFrameIndex,
    );

    animation.onAnimationFrameChangeEvent.raise({
      entity,
      animationFrame,
    });

    spriteAnimationComponent.lastFrameChangeTimeInSeconds =
      this._time.timeInSeconds;
  }
}
