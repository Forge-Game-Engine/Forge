import { Entity, System } from '../../ecs';
import { Time } from '../../common';
import { SpriteAnimationComponent } from '../components';
import { SpriteComponent } from '../../rendering';
import {
  Animation,
  AnimationSetManager,
  finishAnimation,
  immediatelySetCurrentAnimation,
} from '../utilities';

/**
 * System that manages and updates sprite animations for entities, such as from sprite sheets.
 */
export class SpriteAnimationSystem extends System {
  private readonly _time: Time;
  private readonly _animationSetManager: AnimationSetManager;

  /**
   * Creates an instance of SpriteAnimationSystem.
   * @param time - The Time instance.
   * @param animationSetManager - The AnimationSetManager instance.
   */
  constructor(time: Time, animationSetManager: AnimationSetManager) {
    super('spriteAnimation', [
      SpriteAnimationComponent.symbol,
      SpriteComponent.symbol,
    ]);
    this._time = time;
    this._animationSetManager = animationSetManager;
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
    const { animation, animationSpeedFactor, nextAnimation } =
      spriteAnimationComponent;

    // allows animations to be triggered on the first frame of an animation
    if (spriteAnimationComponent.isChangingAnimation) {
      spriteAnimationComponent.isChangingAnimation = false;
      this._raiseAnimationEvent(animation, spriteAnimationComponent, entity);
    }

    const currentFrameDurationSeconds =
      animation.frames[spriteAnimationComponent.animationIndex].durationSeconds;

    const currentFrameTimeSeconds =
      this._time.timeInSeconds - spriteAnimationComponent.frameTimeSeconds;

    const adjustedFrameDuration =
      currentFrameDurationSeconds / animationSpeedFactor;

    if (currentFrameTimeSeconds >= adjustedFrameDuration) {
      spriteAnimationComponent.frameTimeSeconds = this._time.timeInSeconds;

      if (
        spriteAnimationComponent.animationIndex <
        animation.frames.length - 1
      ) {
        spriteAnimationComponent.animationIndex++;
        this._raiseAnimationEvent(animation, spriteAnimationComponent, entity);

        return;
      }

      finishAnimation(spriteAnimationComponent);

      if (nextAnimation) {
        immediatelySetCurrentAnimation(spriteAnimationComponent, nextAnimation);
      } else if (animation.defaultNextAnimationName) {
        const defaultNextAnimation =
          this._animationSetManager.getDefaultNextAnimation(animation);
        immediatelySetCurrentAnimation(
          spriteAnimationComponent,
          defaultNextAnimation,
        );
      }
    }
  }

  /**
   * Raises an animation event for the specified entity on the current frame
   * @param animation - The animation to raise the event for
   * @param spriteAnimationComponent - The sprite animation component
   * @param entity - The entity the animation belongs to
   */
  private _raiseAnimationEvent(
    animation: Animation,
    spriteAnimationComponent: SpriteAnimationComponent,
    entity: Entity,
  ) {
    animation.animationEvents
      .get(spriteAnimationComponent.animationIndex)
      ?.raise(entity);
  }
}
