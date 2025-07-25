import { Entity, System } from '../../ecs';
import { Time } from '../../common';
import { ImageAnimationComponent } from '../components';
import { SpriteComponent } from '../../rendering';
import { SpriteAnimationManager } from './animation-manager-system';

/**
 * System that manages and updates image-based animations for entities, such as from sprite sheets.
 */
export class ImageAnimationSystem extends System {
  private readonly _time: Time;
  private readonly _animationManager: SpriteAnimationManager;

  /**
   * Creates an instance of ImageAnimationSystem.
   * @param time - The Time instance.
   * @param animationManager - The SpriteAnimationManager instance.
   */
  constructor(time: Time, animationManager: SpriteAnimationManager) {
    super('imageAnimation', [
      ImageAnimationComponent.symbol,
      SpriteComponent.symbol,
    ]);
    this._time = time;
    this._animationManager = animationManager;
  }

  /**
   * Runs the animation system for a given entity.
   * @param entity - The entity to update animations for.
   */
  public run(entity: Entity): void {
    const imageAnimationComponent =
      entity.getComponentRequired<ImageAnimationComponent>(
        ImageAnimationComponent.symbol,
      );
    const animationSet = this._animationManager.getAnimationSet(
      imageAnimationComponent.entityType,
      imageAnimationComponent.currentAnimation,
    );

    if (!animationSet) {
      throw new Error(
        `No animation set found for entity type: ${imageAnimationComponent.entityType}, animation: ${imageAnimationComponent.currentAnimation}`,
      );
    }

    const currentFrame =
      animationSet.animationFrames[imageAnimationComponent.animationIndex];

    if (
      this._time.timeInSeconds -
        imageAnimationComponent.currentFrameTimeSeconds >=
      currentFrame.durationSeconds /
        imageAnimationComponent.animationSpeedFactor
    ) {
      imageAnimationComponent.currentFrameTimeSeconds =
        this._time.timeInSeconds;

      if (imageAnimationComponent.animationIndex < animationSet.numFrames - 1) {
        imageAnimationComponent.animationIndex++;

        return;
      }

      imageAnimationComponent.animationIndex = 0;

      if (imageAnimationComponent.nextAnimationSetName) {
        imageAnimationComponent.nextAnimation();
      } else if (animationSet.nextAnimationSetName) {
        imageAnimationComponent.setCurrentAnimation(
          animationSet.nextAnimationSetName,
        );
      }
    }
  }
}
