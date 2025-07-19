import { Entity, System } from '../../ecs';
import { Time } from '../../common';
import { ImageAnimationComponent } from '../components';
import { SpriteComponent } from '../../rendering';
import { AnimationManager } from './animation-manager-system';

export class ImageAnimationSystem extends System {
  private readonly _time: Time;
  private readonly _animationManager: AnimationManager;

  /**
   * Creates an instance of AnimationSystem.
   * @param time - The Time instance.
   */
  constructor(time: Time, animationManager: AnimationManager) {
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
      imageAnimationComponent.getCurrentAnimation(),
    );

    if (!animationSet) {
      console.warn(
        `No animation set found for entity type: ${imageAnimationComponent.entityType}, animation: ${imageAnimationComponent.getCurrentAnimation()}`,
      );

      return;
    }

    const currentFrame =
      animationSet.animationFrames[imageAnimationComponent.animationIndex];

    if (
      this._time.timeInSeconds -
        imageAnimationComponent.currentFrameTimeSeconds >=
      currentFrame.durationSeconds
    ) {
      imageAnimationComponent.currentFrameTimeSeconds =
        this._time.timeInSeconds;

      if (imageAnimationComponent.animationIndex < animationSet.numFrames - 1) {
        imageAnimationComponent.animationIndex++;
      } else {
        imageAnimationComponent.animationIndex = 0;

        if (imageAnimationComponent.nextAnimationState) {
          imageAnimationComponent.nextAnimation();
        } else if (animationSet.nextAnimationState) {
          imageAnimationComponent.setCurrentAnimation(
            animationSet.nextAnimationState,
          );
        }
      }
    }
  }
}
