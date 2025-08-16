import { Entity, System } from '../../ecs';
import { Time } from '../../common';
import { SpriteAnimationComponent } from '../components';
import { SpriteComponent } from '../../rendering';
import { AnimationSetManager } from '../utilities/animation-set-manager';
import {
  finishAnimation,
  goToNextAnimation,
  immediatelySetCurrentAnimation,
} from '..';

/**
 * System that manages and updates image-based animations for entities, such as from sprite sheets.
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
    const animationSet = this._animationSetManager.getAnimation(
      spriteAnimationComponent.animationSetName,
      spriteAnimationComponent.currentAnimationName,
    );

    if (!animationSet) {
      throw new Error(
        `No animation found for animation set: ${spriteAnimationComponent.animationSetName}, animation name: ${spriteAnimationComponent.currentAnimationName}`,
      );
    }

    // allows animations to be triggered on the first frame of an animation
    if (spriteAnimationComponent.isChangingAnimation) {
      spriteAnimationComponent.isChangingAnimation = false;
      animationSet.animationEvents
        .get(spriteAnimationComponent.animationIndex)
        ?.raise(entity);
    }

    const currentFrame =
      animationSet.frames[spriteAnimationComponent.animationIndex];

    if (
      this._time.timeInSeconds -
        spriteAnimationComponent.currentFrameTimeSeconds >=
      currentFrame.durationSeconds /
        spriteAnimationComponent.animationSpeedFactor
    ) {
      spriteAnimationComponent.currentFrameTimeSeconds =
        this._time.timeInSeconds;

      if (
        spriteAnimationComponent.animationIndex <
        animationSet.frames.length - 1
      ) {
        spriteAnimationComponent.animationIndex++;
        animationSet.animationEvents
          .get(spriteAnimationComponent.animationIndex)
          ?.raise(entity);

        return;
      }

      finishAnimation(spriteAnimationComponent);

      if (spriteAnimationComponent.nextAnimationName) {
        goToNextAnimation(spriteAnimationComponent);
      } else if (animationSet.nextAnimationName) {
        immediatelySetCurrentAnimation(
          spriteAnimationComponent,
          animationSet.nextAnimationName,
        );
      }
    }
  }
}
