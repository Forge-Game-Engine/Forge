import { Entity, System } from '../../ecs';
import { Time } from '../../common';
import { SpriteAnimationComponent } from '../components';
import { SpriteComponent } from '../../rendering';
import { AnimationSetManager } from './animation-set-manager';
import {
  goToNextAnimation,
  finishAnimation,
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
    const animationSet = this._animationSetManager.getAnimationSet(
      spriteAnimationComponent.entityType,
      spriteAnimationComponent.currentAnimationSetName,
    );

    if (!animationSet) {
      throw new Error(
        `No animation set found for entity type: ${spriteAnimationComponent.entityType}, animation: ${spriteAnimationComponent.currentAnimationSetName}`,
      );
    }

    // allows animations to be triggered on the first frame of an animation
    if (spriteAnimationComponent.isChangingAnimation) {
      spriteAnimationComponent.isChangingAnimation = false;
      animationSet.animationCallbacks
        .get(spriteAnimationComponent.animationIndex)
        ?.raise(entity);
    }

    const currentFrame =
      animationSet.animationFrames[spriteAnimationComponent.animationIndex];

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
        animationSet.numFrames - 1
      ) {
        spriteAnimationComponent.animationIndex++;
        animationSet.animationCallbacks
          .get(spriteAnimationComponent.animationIndex)
          ?.raise(entity);

        return;
      }

      finishAnimation(spriteAnimationComponent);

      if (spriteAnimationComponent.nextAnimationSetName) {
        goToNextAnimation(spriteAnimationComponent);
      } else if (animationSet.nextAnimationSetName) {
        immediatelySetCurrentAnimation(
          spriteAnimationComponent,
          animationSet.nextAnimationSetName,
        );
      }
    }
  }
}
