import { Entity, System } from '../../ecs';
import { Time } from '../../common';
import { ImageAnimationComponent } from '../components';
import { SpriteComponent } from '../../rendering';

export class ImageAnimationSystem extends System {
  private readonly _time: Time;

  /**
   * Creates an instance of AnimationSystem.
   * @param time - The Time instance.
   */
  constructor(time: Time) {
    super('imageAnimation', [
      ImageAnimationComponent.symbol,
      SpriteComponent.symbol,
    ]);
    this._time = time;
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

    if (
      this._time.timeInSeconds - imageAnimationComponent.frameTime >=
      imageAnimationComponent.frameLengthInSeconds
    ) {
      this._nextFrame(entity, imageAnimationComponent);
    }
  }

  private _nextFrame(
    entity: Entity,
    imageAnimationComponent: ImageAnimationComponent,
  ): void {
    imageAnimationComponent.frameTime = this._time.timeInSeconds;

    const spriteComponent = entity.getComponentRequired<SpriteComponent>(
      SpriteComponent.symbol,
    );

    spriteComponent.sprite.renderable.geometry =
      imageAnimationComponent.frameGeometry[
        imageAnimationComponent.animationIndex
      ];

    imageAnimationComponent.animationIndex =
      (imageAnimationComponent.animationIndex + 1) %
      imageAnimationComponent.numFrames;
  }
}
